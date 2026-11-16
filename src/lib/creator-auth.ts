import { ethers } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-session';
import { getRpcUrlByChainId } from '@/config/blockchain';
import {
  buildCreatorAuthMessage,
  CREATOR_AUTH_HEADERS,
  CREATOR_AUTH_MAX_AGE_MS,
  IPFS_UPLOAD_TARGET,
  type CreatorAction,
} from '@/lib/creator-auth-message';

const OWNER_ABI = ['function owner() view returns (address)'];
const FUTURE_SKEW_MS = 60 * 1000;

function deny(status: 401 | 403, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

/** Recovers and validates the wallet that signed the creator auth headers. */
export function verifyCreatorSignature(
  request: NextRequest,
  action: CreatorAction,
  target: string
): string | null {
  const address = request.headers.get(CREATOR_AUTH_HEADERS.address);
  const issuedAt = request.headers.get(CREATOR_AUTH_HEADERS.issuedAt);
  const signature = request.headers.get(CREATOR_AUTH_HEADERS.signature);
  if (!address || !issuedAt || !signature || !ethers.isAddress(address)) return null;

  const issuedMs = Date.parse(issuedAt);
  const now = Date.now();
  if (!Number.isFinite(issuedMs) || issuedMs < now - CREATOR_AUTH_MAX_AGE_MS || issuedMs > now + FUTURE_SKEW_MS) {
    return null;
  }

  try {
    const message = buildCreatorAuthMessage({ action, target, signer: address, issuedAt });
    const recovered = ethers.verifyMessage(message, signature);
    // Addresses are public; a plain comparison does not leak secrets.
    return recovered.toLowerCase() === address.toLowerCase() ? recovered.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function getOnChainOwner(chainId: number, contractAddress: string): Promise<string | null> {
  const rpcUrl = getRpcUrlByChainId(chainId);
  if (!rpcUrl || !ethers.isAddress(contractAddress)) return null;
  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
  try {
    const contract = new ethers.Contract(contractAddress, OWNER_ABI, provider);
    const owner: string = await contract.owner();
    return owner.toLowerCase();
  } catch {
    return null;
  } finally {
    provider.destroy();
  }
}

/**
 * Allows the request when it comes from an admin (session cookie / ADMIN_API_KEY)
 * or carries a valid wallet signature from the collection's creator (DB record)
 * or current on-chain owner(). Returns an error response, or null when allowed.
 *
 * @param target contract address (0x...) or launchpad id
 * @param chainId used for the on-chain owner() check when there is no DB record yet
 */
export async function authorizeCreatorOrAdmin(
  request: NextRequest,
  opts: { action: CreatorAction; target: string; chainId?: number }
): Promise<NextResponse | null> {
  if (await isAdminRequest(request)) return null;

  const target = (opts.target || '').trim();
  if (!target) return deny(401, 'Unauthorized');

  const signer = verifyCreatorSignature(request, opts.action, target);
  if (!signer) {
    return deny(401, 'Unauthorized: admin session or creator wallet signature required');
  }

  const record = await prisma.launchpad.findFirst({
    where: target.startsWith('0x')
      ? { contractAddress: { equals: target, mode: 'insensitive' } }
      : { id: target },
    select: { creator: true, chainId: true, contractAddress: true },
  });

  if (record?.creator && record.creator.toLowerCase() === signer) return null;

  const chainId = record?.chainId ?? opts.chainId;
  const contractAddress = record?.contractAddress ?? (target.startsWith('0x') ? target : null);
  if (chainId && contractAddress) {
    const owner = await getOnChainOwner(Number(chainId), contractAddress);
    if (owner && owner === signer) return null;
  }

  return deny(403, 'Forbidden: signer is not the creator/owner of this collection');
}

// ---------------------------------------------------------------------------
// IPFS uploads
// ---------------------------------------------------------------------------

const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const UPLOAD_LIMIT_PER_WALLET = 300;
const UPLOAD_LIMIT_PER_IP = 600;
const uploadHits = new Map<string, number[]>();

/** Simple in-memory sliding-window limiter (per instance). */
function overLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const hits = (uploadHits.get(key) || []).filter((t) => t > now - UPLOAD_WINDOW_MS);
  hits.push(now);
  uploadHits.set(key, hits);
  if (uploadHits.size > 10_000) {
    uploadHits.forEach((v, k) => {
      if (!v.length || v[v.length - 1] <= now - UPLOAD_WINDOW_MS) uploadHits.delete(k);
    });
  }
  return hits.length > limit;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Guards the IPFS upload routes (they spend the server's Pinata quota).
 * Allowed: admin session / ADMIN_API_KEY, or a fresh wallet signature for
 * action 'ipfs:upload' (any wallet - uploads happen before a collection exists),
 * rate limited per wallet and per IP.
 */
export async function authorizeUploader(request: NextRequest): Promise<NextResponse | null> {
  if (await isAdminRequest(request)) return null;

  const signer = verifyCreatorSignature(request, 'ipfs:upload', IPFS_UPLOAD_TARGET);
  if (!signer) {
    return deny(401, 'Unauthorized: connect a wallet and sign the upload authorization');
  }
  if (overLimit(`w:${signer}`, UPLOAD_LIMIT_PER_WALLET) || overLimit(`ip:${clientIp(request)}`, UPLOAD_LIMIT_PER_IP)) {
    return NextResponse.json({ success: false, error: 'Too many uploads, try again later' }, { status: 429 });
  }
  return null;
}

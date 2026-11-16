export interface CollectionData {
  id: string;
  name: string;
  creator: string;
  chain: string;
  description: string;
  image: string | null;
  contractAddress: string;
  website: string;
  twitter?: string;
  discord?: string;
  sellPrice: string;
  walletLimit: string;
  eligible: boolean;
  totalSupply: number;
  totalMinted: number;
  airdropPercent: number;
  mintedPercent: number;
  createdAt?: Date;
  royalties?: string;
  phases?: MintPhase[];
}

export interface MintPhase {
  id?: number | string; // Phase ID from database (string cuid)
  phaseIndex?: number; // Phase index in smart contract (0-based integer)
  name: string;
  phaseType?: string;
  startTime: Date;
  endTime: Date | null;
  price: string;
  isActive: boolean;
  maxPerWallet?: number;
  totalLimit?: number;
  mintedCount?: number;
  merkleRoot?: string;
  requiresWhitelist?: boolean;
}

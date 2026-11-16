import { API_CONFIG } from '@/constants/endpoints';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: 'accurate' | 'normal';
  } = {}
) {
  const { decimals = 0, sizeType = 'normal' } = opts;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === 'accurate'
      ? (accurateSizes[i] ?? 'Bytest')
      : (sizes[i] ?? 'Bytes')
  }`;
}

export function isTokenExpired(token: string | undefined) {

  if (!token) return true;

  const arrayToken = token.split('.');
  const tokenPayload = JSON.parse(atob(arrayToken[1]));
  return Math.floor(new Date().getTime() / 1000) >= tokenPayload?.exp;
}

export function getJWTExpiration(token: string | undefined) {
  if (!token) return 0;

  const arrayToken = token.split('.');
  const tokenPayload = JSON.parse(atob(arrayToken[1]));
  return tokenPayload?.exp || 0;
}

export const calculateMaxAge = (token: string): number => {
  const exp = getJWTExpiration(token);
  if (!exp) {
      // Fallback ke 7 hari jika gagal decode
      return 7 * 24 * 60 * 60;
  }
  
  const currentTime = Math.floor(Date.now() / 1000); // Current time dalam detik
  const maxAge = exp - currentTime;
  
  // Pastikan max-age tidak negatif
  return maxAge > 0 ? maxAge : 0;
}

export function formatAddress(address: string | undefined) {
  if (!address) return '';
  return `${address.substring(5, 9)}...${address.substring(
    address.length - 4
  )}`;
}
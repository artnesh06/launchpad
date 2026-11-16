'use client';

import { useGasPrice } from '@/hooks/use-gas-price';

interface ModalFooterWithGasProps {
  chainId?: number;
}

export function ModalFooterWithGas({ chainId }: ModalFooterWithGasProps = {}) {
  const { gasPrice, isLoading } = useGasPrice(chainId);

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <span className="font-mono">
        Gas {isLoading ? '...' : gasPrice} GWEI
      </span>
      <span>|</span>
      <span>Terms of Service</span>
    </div>
  );
}

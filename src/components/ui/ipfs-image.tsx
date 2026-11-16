'use client';

import { useState, useEffect } from 'react';
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';
import { cn } from '@/lib/utils';

interface IpfsImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  alt: string;
  fallback?: string | React.ReactNode;
  showLoader?: boolean;
}

/**
 * Optimized Image component for IPFS
 * - Uses fastest gateway automatically
 * - Native <img> tag (no Next.js optimization overhead)
 * - Automatic fallback on error
 * - Optional loading state
 */
export function IpfsImage({
  src,
  alt,
  fallback = '/placeholder.png',
  showLoader = false,
  className,
  onError,
  ...props
}: IpfsImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Convert IPFS to HTTP with fastest gateway
  const { httpUrl, loading: urlLoading } = useIpfsToHttp(src);

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageError(true);
    setIsLoading(false);
    onError?.(e);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Show loader while converting URL
  if (urlLoading && showLoader) {
    return (
      <div className={cn('flex items-center justify-center bg-[#2D253E]', className)}>
        <img 
          src="/images/Loading.png" 
          alt="Loading..." 
          className="w-16 h-16 object-contain animate-pulse"
        />
      </div>
    );
  }

  // Show fallback if error or no URL
  if (imageError || !httpUrl) {
    // If fallback is a string (URL), render img
    if (typeof fallback === 'string') {
      return (
        <img
          src={fallback}
          alt={alt}
          className={className}
          {...props}
        />
      );
    }
    // If fallback is a ReactNode, render it directly
    return <>{fallback}</>;
  }

  return (
    <>
      {isLoading && showLoader && (
        <div className={cn('absolute inset-0 flex items-center justify-center bg-[#2D253E]', className)}>
          <img 
            src="/images/Loading.png" 
            alt="Loading..." 
            className="w-16 h-16 object-contain animate-pulse"
          />
        </div>
      )}
      <img
        src={httpUrl}
        alt={alt}
        className={cn(className, isLoading && showLoader && 'opacity-0')}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </>
  );
}

/**
 * Simple IPFS Image without loading state
 * For cases where you just need basic IPFS support
 */
export function SimpleIpfsImage({
  src,
  alt,
  fallback = '/placeholder.png',
  className,
  ...props
}: IpfsImageProps) {
  const [imageError, setImageError] = useState(false);
  const { httpUrl } = useIpfsToHttp(src);

  if (imageError || !httpUrl) {
    // If fallback is a string (URL), render img
    if (typeof fallback === 'string') {
      return <img src={fallback} alt={alt} className={className} {...props} />;
    }
    // If fallback is a ReactNode, render it directly
    return <>{fallback}</>;
  }

  return (
    <img
      src={httpUrl}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      {...props}
    />
  );
}

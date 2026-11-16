import { useState, useEffect } from 'react';
import { ipfsToHttpOptimized, ipfsToHttp } from '@/lib/ipfs-utils';

/**
 * React hook untuk konversi IPFS URI ke HTTP URL dengan optimized gateway
 * @param ipfsUri - IPFS URI yang akan dikonversi
 * @returns Object dengan httpUrl dan loading state
 */
export function useIpfsToHttp(ipfsUri: string | null | undefined) {
  const [httpUrl, setHttpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ipfsUri) {
      setHttpUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Always use optimized version (handles all URL types)
    ipfsToHttpOptimized(ipfsUri)
      .then((url) => {
        if (isMounted) {
          setHttpUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error converting IPFS to HTTP:', err);
          setError(err);
          // Fallback to sync conversion
          setHttpUrl(ipfsToHttp(ipfsUri));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [ipfsUri]);

  return { httpUrl, loading, error };
}

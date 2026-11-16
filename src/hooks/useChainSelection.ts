'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'selected-chain';

interface ChainSelection {
  chainName: string;
  chainId: number | 'all';
}

export function useChainSelection() {
  const [selectedChain, setSelectedChain] = useState<string>("All Chain");
  const [selectedChainId, setSelectedChainId] = useState<number | 'all'>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load dari local storage saat mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ChainSelection = JSON.parse(stored);
        setSelectedChain(parsed.chainName);
        setSelectedChainId(parsed.chainId);
      }
    } catch (error) {
      console.error('Error loading chain selection from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Simpan ke local storage setiap kali berubah
  useEffect(() => {
    if (isLoaded) {
      try {
        const data: ChainSelection = {
          chainName: selectedChain,
          chainId: selectedChainId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving chain selection to localStorage:', error);
      }
    }
  }, [selectedChain, selectedChainId, isLoaded]);

  const handleChainChange = (chainName: string, chainId: number | 'all') => {
    setSelectedChain(chainName);
    setSelectedChainId(chainId);
  };

  return {
    selectedChain,
    selectedChainId,
    handleChainChange,
    isLoaded
  };
}

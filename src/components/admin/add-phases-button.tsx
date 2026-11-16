'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';

interface AddPhasesButtonProps {
  chainId: number;
  contractAddress: string;
  onSuccess?: () => void;
}

export function AddPhasesButton({ chainId, contractAddress, onSuccess }: AddPhasesButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAddPhases = async () => {
    try {
      setLoading(true);
      
      toast.info('Adding phases to contract...', {
        description: 'This may take a few moments. Please confirm transactions in your wallet.'
      , id: TOAST_ID });

      const response = await fetch('/api/admin/launchpads/add-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId, contractAddress })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Phases added successfully!', {
          description: data.message
        , id: TOAST_ID });
        onSuccess?.();
      } else {
        toast.error('Failed to add phases', {
          description: data.error || 'Unknown error'
        , id: TOAST_ID });
      }

    } catch (error) {
      console.error('Error adding phases:', error);
      toast.error('Failed to add phases', {
        description: error instanceof Error ? error.message : 'Unknown error'
      , id: TOAST_ID });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAddPhases}
      disabled={loading}
      size="sm"
      variant="outline"
    >
      {loading ? (
        <>
          <HugeiconsIcon icon={Loading01Icon} size={16} className="mr-2 animate-spin" />
          Adding Phases...
        </>
      ) : (
        <>
          <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
          Add Phases to Contract
        </>
      )}
    </Button>
  );
}




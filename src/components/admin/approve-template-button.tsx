'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { TickDouble02Icon, Loading01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';

interface ApproveTemplateButtonProps {
  chainId: number;
  onSuccess?: () => void;
}

export function ApproveTemplateButton({ chainId, onSuccess }: ApproveTemplateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      
      toast.info('Approving template...', {
        description: 'Please confirm the transaction in your wallet.'
      , id: TOAST_ID });

      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      
      const result = await contractService.approveOddsLaunchpadTemplate(chainId);
      
      if (result === 'already-approved') {
        toast.success('Template already approved!', {
          description: 'Bytecode hash matches - ready to deploy.'
        , id: TOAST_ID });
        setApproved(true);
      } else {
        toast.success('Template approved successfully!', {
          description: `Transaction: ${result.slice(0, 10, { id: TOAST_ID })}...`
        });
        setApproved(true);
        onSuccess?.();
      }

    } catch (error) {
      console.error('Error approving template:', error);
      
      let errorMessage = 'Failed to approve template';
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user';
        } else if (error.message.includes('NotAdmin')) {
          errorMessage = 'Only admin can approve templates';
        } else if (error.message.includes('Bytecode hash mismatch')) {
          errorMessage = 'Bytecode updated - re-approving...';
          // Auto retry with force flag
          toast.info('Bytecode changed, updating approval...', { id: TOAST_ID });
          setTimeout(() => handleApprove(), 1000);
          return;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error('Approval failed', {
        description: errorMessage
      , id: TOAST_ID });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleApprove}
      disabled={loading || approved}
      size="sm"
      variant={approved ? "outline" : "default"}
    >
      {loading ? (
        <>
          <HugeiconsIcon icon={Loading01Icon} size={16} className="mr-2 animate-spin" />
          Approving...
        </>
      ) : approved ? (
        <>
          <HugeiconsIcon icon={TickDouble02Icon} size={16} className="mr-2 text-green-500" />
          Template Approved
        </>
      ) : (
        <>
          <HugeiconsIcon icon={AlertCircleIcon} size={16} className="mr-2" />
          Approve Template
        </>
      )}
    </Button>
  );
}




'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  LinkSquare02Icon, 
  Add01Icon, 
  PencilEdit02Icon, 
  Delete02Icon,
  Cancel01Icon,
  Tick02Icon,
  AlertCircleIcon
} from '@hugeicons/core-free-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface Chain {
  id: string;
  name: string;
  networkId: string;
  rpcEndpoint: string;
  explorerUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChainFormData {
  name: string;
  networkId: string;
  rpcEndpoint: string;
  explorerUrl: string;
}

interface ValidationError {
  success: false;
  error: string;
  errors?: string[];
  dependencies?: Array<{
    type: string;
    id: string;
    name: string;
  }>;
  message?: string;
}

export function ChainConfigPanel() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<Chain | null>(null);
  const [deletingChain, setDeletingChain] = useState<Chain | null>(null);
  const [formData, setFormData] = useState<ChainFormData>({
    name: '',
    networkId: '',
    rpcEndpoint: '',
    explorerUrl: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string>('');

  useEffect(() => {
    fetchChains();
  }, []);

  const fetchChains = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/chains');
      const result = await response.json();
      
      if (result.success) {
        setChains(result.data);
      } else {
        toast.error('Failed to load chains');
      }
    } catch (error) {
      console.error('Error fetching chains:', error);
      toast.error('Failed to load chains');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (chain?: Chain) => {
    if (chain) {
      setEditingChain(chain);
      setFormData({
        name: chain.name,
        networkId: chain.networkId,
        rpcEndpoint: chain.rpcEndpoint,
        explorerUrl: chain.explorerUrl || '',
      });
    } else {
      setEditingChain(null);
      setFormData({
        name: '',
        networkId: '',
        rpcEndpoint: '',
        explorerUrl: '',
      });
    }
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingChain(null);
    setFormData({
      name: '',
      networkId: '',
      rpcEndpoint: '',
      explorerUrl: '',
    });
    setValidationErrors([]);
  };

  const handleSubmit = async () => {
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const url = editingChain 
        ? `/api/admin/chains/${editingChain.id}`
        : '/api/admin/chains';
      
      const method = editingChain ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingChain ? 'Chain updated successfully' : 'Chain created successfully');
        handleCloseDialog();
        fetchChains();
      } else {
        // Display validation errors
        if (result.errors && Array.isArray(result.errors)) {
          setValidationErrors(result.errors);
        } else if (result.error) {
          setValidationErrors([result.error]);
        }
      }
    } catch (error) {
      console.error('Error saving chain:', error);
      toast.error('Failed to save chain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (chain: Chain) => {
    setDeletingChain(chain);
    setDeleteWarning('');
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingChain) return;

    try {
      const response = await fetch(`/api/admin/chains/${deletingChain.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chain deleted successfully');
        setIsDeleteDialogOpen(false);
        setDeletingChain(null);
        setDeleteWarning('');
        fetchChains();
      } else {
        // Show dependency warning
        if (result.dependencies && result.dependencies.length > 0) {
          const dependencyList = result.dependencies
            .map((dep: any) => `${dep.name} (${dep.type})`)
            .join(', ');
          setDeleteWarning(
            result.message || 
            `Cannot delete this chain. It is referenced by: ${dependencyList}`
          );
        } else {
          toast.error(result.error || 'Failed to delete chain');
          setIsDeleteDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error deleting chain:', error);
      toast.error('Failed to delete chain');
    }
  };

  return (
    <>
      <Card className="bg-[#0D0E11] border-[#2F3336]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-mono">Blockchain Networks</CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Configure which blockchain networks the system supports for NFT verification
              </CardDescription>
            </div>
            <Button 
              className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
              onClick={() => handleOpenDialog()}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Add Chain
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400 font-mono">Loading chains...</p>
            </div>
          ) : chains.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-2">
                <HugeiconsIcon icon={LinkSquare02Icon} size={48} className="text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400 font-mono">No chains configured yet</p>
                <p className="text-xs text-gray-500 font-mono">
                  Add blockchain networks to enable NFT verification across multiple chains
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chains.map((chain) => (
                <div
                  key={chain.id}
                  className="flex items-center justify-between p-4 bg-[#161B22] border border-[#2F3336] rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-mono font-semibold">{chain.name}</h3>
                      <span className="text-xs text-gray-500 font-mono">
                        Network ID: {chain.networkId}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono mt-1 break-all">
                      {chain.rpcEndpoint}
                    </p>
                    {chain.explorerUrl && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Explorer: {chain.explorerUrl}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-[#2F3336]"
                      onClick={() => handleOpenDialog(chain)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-[#2F3336]"
                      onClick={() => handleOpenDeleteDialog(chain)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingChain ? 'Edit Chain' : 'Add Chain'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono">
              {editingChain 
                ? 'Update the blockchain network configuration'
                : 'Add a new blockchain network for NFT verification'
              }
            </DialogDescription>
          </DialogHeader>

          {validationErrors.length > 0 && (
            <Alert className="bg-red-900/20 border-red-900">
              <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-red-400" />
              <AlertDescription className="text-red-400 font-mono text-sm">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 font-mono">
                Chain Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Ethereum Mainnet"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="networkId" className="text-gray-300 font-mono">
                Network ID *
              </Label>
              <Input
                id="networkId"
                placeholder="e.g., 1"
                value={formData.networkId}
                onChange={(e) => setFormData({ ...formData, networkId: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rpcEndpoint" className="text-gray-300 font-mono">
                RPC Endpoint *
              </Label>
              <Input
                id="rpcEndpoint"
                placeholder="e.g., https://eth-mainnet.g.alchemy.com/v2/..."
                value={formData.rpcEndpoint}
                onChange={(e) => setFormData({ ...formData, rpcEndpoint: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="explorerUrl" className="text-gray-300 font-mono">
                Explorer URL (Optional)
              </Label>
              <Input
                id="explorerUrl"
                placeholder="e.g., https://etherscan.io"
                value={formData.explorerUrl}
                onChange={(e) => setFormData({ ...formData, explorerUrl: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleCloseDialog}
              className="text-gray-400 hover:text-white font-mono"
              disabled={isSubmitting}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} className="mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
              disabled={isSubmitting}
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} className="mr-2" />
              {isSubmitting ? 'Saving...' : editingChain ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">Delete Chain</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 font-mono">
              Are you sure you want to delete "{deletingChain?.name}"?
              {!deleteWarning && ' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteWarning && (
            <Alert className="bg-yellow-900/20 border-yellow-900">
              <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-yellow-400" />
              <AlertDescription className="text-yellow-400 font-mono text-sm">
                {deleteWarning}
              </AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-transparent border-[#2F3336] text-gray-400 hover:text-white font-mono"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingChain(null);
                setDeleteWarning('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            {!deleteWarning && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-mono"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

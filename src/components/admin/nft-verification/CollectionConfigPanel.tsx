'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Layers01Icon, 
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
}

interface Collection {
  id: string;
  name: string;
  contractAddress: string;
  chainId: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  chain: Chain;
}

interface CollectionFormData {
  name: string;
  contractAddress: string;
  chainId: string;
  description: string;
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

export function CollectionConfigPanel() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>({
    name: '',
    contractAddress: '',
    chainId: '',
    description: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string>('');

  useEffect(() => {
    fetchCollections();
    fetchChains();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/collections');
      const result = await response.json();
      
      if (result.success) {
        setCollections(result.data);
      } else {
        toast.error('Failed to load collections');
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const fetchChains = async () => {
    try {
      const response = await fetch('/api/admin/chains');
      const result = await response.json();
      
      if (result.success) {
        setChains(result.data);
      } else {
        console.error('Failed to load chains');
      }
    } catch (error) {
      console.error('Error fetching chains:', error);
    }
  };

  const handleOpenDialog = (collection?: Collection) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        name: collection.name,
        contractAddress: collection.contractAddress,
        chainId: collection.chainId,
        description: collection.description || '',
      });
    } else {
      setEditingCollection(null);
      setFormData({
        name: '',
        contractAddress: '',
        chainId: '',
        description: '',
      });
    }
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCollection(null);
    setFormData({
      name: '',
      contractAddress: '',
      chainId: '',
      description: '',
    });
    setValidationErrors([]);
  };

  const handleSubmit = async () => {
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const url = editingCollection 
        ? `/api/admin/collections/${editingCollection.id}`
        : '/api/admin/collections';
      
      const method = editingCollection ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingCollection ? 'Collection updated successfully' : 'Collection created successfully');
        handleCloseDialog();
        fetchCollections();
      } else {
        // Display validation errors
        if (result.errors && Array.isArray(result.errors)) {
          setValidationErrors(result.errors);
        } else if (result.error) {
          setValidationErrors([result.error]);
        }
      }
    } catch (error) {
      console.error('Error saving collection:', error);
      toast.error('Failed to save collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (collection: Collection) => {
    setDeletingCollection(collection);
    setDeleteWarning('');
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCollection) return;

    try {
      const response = await fetch(`/api/admin/collections/${deletingCollection.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Collection deleted successfully');
        setIsDeleteDialogOpen(false);
        setDeletingCollection(null);
        setDeleteWarning('');
        fetchCollections();
      } else {
        // Show dependency warning
        if (result.dependencies && result.dependencies.length > 0) {
          const dependencyList = result.dependencies
            .map((dep: any) => `${dep.name} (${dep.type})`)
            .join(', ');
          setDeleteWarning(
            result.message || 
            `Cannot delete this collection. It is referenced by: ${dependencyList}`
          );
        } else {
          toast.error(result.error || 'Failed to delete collection');
          setIsDeleteDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    }
  };

  return (
    <>
      <Card className="bg-[#0D0E11] border-[#2F3336]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-mono">NFT Collections</CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Manage NFT collection contracts that will be verified for role assignment
              </CardDescription>
            </div>
            <Button 
              className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
              onClick={() => handleOpenDialog()}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Add Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400 font-mono">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-2">
                <HugeiconsIcon icon={Layers01Icon} size={48} className="text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400 font-mono">No collections configured yet</p>
                <p className="text-xs text-gray-500 font-mono">
                  Add NFT collections to track ownership for Discord role assignment
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center justify-between p-4 bg-[#161B22] border border-[#2F3336] rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-mono font-semibold">{collection.name}</h3>
                      <span className="text-xs text-gray-500 font-mono">
                        {collection.chain.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono mt-1 break-all">
                      {collection.contractAddress}
                    </p>
                    {collection.description && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-[#2F3336]"
                      onClick={() => handleOpenDialog(collection)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-[#2F3336]"
                      onClick={() => handleOpenDeleteDialog(collection)}
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
              {editingCollection ? 'Edit Collection' : 'Add Collection'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono">
              {editingCollection 
                ? 'Update the NFT collection configuration'
                : 'Add a new NFT collection for role verification'
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
                Collection Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Bored Ape Yacht Club"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chainId" className="text-gray-300 font-mono">
                Blockchain Network *
              </Label>
              <Select
                value={formData.chainId}
                onValueChange={(value) => setFormData({ ...formData, chainId: value })}
              >
                <SelectTrigger className="bg-[#161B22] border-[#2F3336] text-white font-mono">
                  <SelectValue placeholder="Select a chain" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#2F3336] text-white">
                  {chains.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id} className="font-mono">
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractAddress" className="text-gray-300 font-mono">
                Contract Address *
              </Label>
              <Input
                id="contractAddress"
                placeholder="e.g., 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
                value={formData.contractAddress}
                onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300 font-mono">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="e.g., Premium NFT collection for exclusive access"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
                rows={3}
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
              {isSubmitting ? 'Saving...' : editingCollection ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">Delete Collection</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 font-mono">
              Are you sure you want to delete "{deletingCollection?.name}"?
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
                setDeletingCollection(null);
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

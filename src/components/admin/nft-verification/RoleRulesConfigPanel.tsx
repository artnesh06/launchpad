'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  UserMultiple02Icon, 
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
  chain: Chain;
}

interface RoleRule {
  id: string;
  name: string;
  discordRoleId: string;
  ruleType: 'individual_contract' | 'multi_contract' | 'nft_threshold';
  threshold?: number;
  requirementType?: 'any' | 'all';
  createdAt: string;
  updatedAt: string;
  collections: Array<{
    collection: Collection;
  }>;
}

interface RoleRuleFormData {
  name: string;
  discordRoleId: string;
  ruleType: 'individual_contract' | 'multi_contract' | 'nft_threshold' | '';
  contracts: string[];
  threshold: string;
  requirementType: 'any' | 'all' | '';
}

export function RoleRulesConfigPanel() {
  const [roleRules, setRoleRules] = useState<RoleRule[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRoleRule, setEditingRoleRule] = useState<RoleRule | null>(null);
  const [deletingRoleRule, setDeletingRoleRule] = useState<RoleRule | null>(null);
  const [formData, setFormData] = useState<RoleRuleFormData>({
    name: '',
    discordRoleId: '',
    ruleType: '',
    contracts: [],
    threshold: '',
    requirementType: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRoleRules();
    fetchCollections();
  }, []);

  const fetchRoleRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/role-rules');
      const result = await response.json();
      
      if (result.success) {
        setRoleRules(result.data);
      } else {
        toast.error('Failed to load role rules');
      }
    } catch (error) {
      console.error('Error fetching role rules:', error);
      toast.error('Failed to load role rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/admin/collections');
      const result = await response.json();
      
      if (result.success) {
        setCollections(result.data);
      } else {
        console.error('Failed to load collections');
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleOpenDialog = (roleRule?: RoleRule) => {
    if (roleRule) {
      setEditingRoleRule(roleRule);
      setFormData({
        name: roleRule.name,
        discordRoleId: roleRule.discordRoleId,
        ruleType: roleRule.ruleType,
        contracts: roleRule.collections.map(c => c.collection.id),
        threshold: roleRule.threshold?.toString() || '',
        requirementType: roleRule.requirementType || '',
      });
    } else {
      setEditingRoleRule(null);
      setFormData({
        name: '',
        discordRoleId: '',
        ruleType: '',
        contracts: [],
        threshold: '',
        requirementType: '',
      });
    }
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRoleRule(null);
    setFormData({
      name: '',
      discordRoleId: '',
      ruleType: '',
      contracts: [],
      threshold: '',
      requirementType: '',
    });
    setValidationErrors([]);
  };

  const handleRuleTypeChange = (value: string) => {
    setFormData({
      ...formData,
      ruleType: value as RoleRuleFormData['ruleType'],
      // Reset fields that may not apply to the new rule type
      threshold: value === 'individual_contract' || value === 'nft_threshold' ? formData.threshold : '',
      requirementType: value === 'multi_contract' ? formData.requirementType : '',
    });
  };

  const handleCollectionToggle = (collectionId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        contracts: [...formData.contracts, collectionId],
      });
    } else {
      setFormData({
        ...formData,
        contracts: formData.contracts.filter(id => id !== collectionId),
      });
    }
  };

  const handleSubmit = async () => {
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const url = editingRoleRule 
        ? `/api/admin/role-rules/${editingRoleRule.id}`
        : '/api/admin/role-rules';
      
      const method = editingRoleRule ? 'PUT' : 'POST';

      // Prepare the payload based on rule type
      const payload: any = {
        name: formData.name,
        discordRoleId: formData.discordRoleId,
        ruleType: formData.ruleType,
        contracts: formData.contracts,
      };

      // Add threshold for individual_contract and nft_threshold
      if (formData.ruleType === 'individual_contract' || formData.ruleType === 'nft_threshold') {
        payload.threshold = formData.threshold ? parseInt(formData.threshold, 10) : undefined;
      }

      // Add requirementType for multi_contract
      if (formData.ruleType === 'multi_contract') {
        payload.requirementType = formData.requirementType;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingRoleRule ? 'Role rule updated successfully' : 'Role rule created successfully');
        handleCloseDialog();
        fetchRoleRules();
      } else {
        // Display validation errors
        if (result.errors && Array.isArray(result.errors)) {
          setValidationErrors(result.errors);
        } else if (result.error) {
          setValidationErrors([result.error]);
        }
      }
    } catch (error) {
      console.error('Error saving role rule:', error);
      toast.error('Failed to save role rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (roleRule: RoleRule) => {
    setDeletingRoleRule(roleRule);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRoleRule) return;

    try {
      const response = await fetch(`/api/admin/role-rules/${deletingRoleRule.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Role rule deleted successfully');
        setIsDeleteDialogOpen(false);
        setDeletingRoleRule(null);
        fetchRoleRules();
      } else {
        toast.error(result.error || 'Failed to delete role rule');
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting role rule:', error);
      toast.error('Failed to delete role rule');
    }
  };

  const getRuleTypeLabel = (ruleType: string) => {
    switch (ruleType) {
      case 'individual_contract':
        return 'Individual Contract';
      case 'multi_contract':
        return 'Multi Contract';
      case 'nft_threshold':
        return 'NFT Threshold';
      default:
        return ruleType;
    }
  };

  const getRuleDescription = (rule: RoleRule) => {
    const collectionNames = rule.collections.map(c => c.collection.name).join(', ');
    
    switch (rule.ruleType) {
      case 'individual_contract':
        return `Own at least ${rule.threshold} NFT(s) from: ${collectionNames}`;
      case 'multi_contract':
        return `Own NFTs from ${rule.requirementType === 'all' ? 'all' : 'any'} of: ${collectionNames}`;
      case 'nft_threshold':
        return `Own at least ${rule.threshold} total NFT(s) across: ${collectionNames}`;
      default:
        return collectionNames;
    }
  };

  return (
    <>
      <Card className="bg-[#0D0E11] border-[#2F3336]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-mono">Role Assignment Rules</CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Define rules for automatically assigning Discord roles based on NFT ownership
              </CardDescription>
            </div>
            <Button 
              className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
              onClick={() => handleOpenDialog()}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400 font-mono">Loading role rules...</p>
            </div>
          ) : roleRules.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div className="space-y-2">
                <HugeiconsIcon icon={UserMultiple02Icon} size={48} className="text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400 font-mono">No role rules configured yet</p>
                <p className="text-xs text-gray-500 font-mono">
                  Create rules to automatically assign Discord roles based on NFT holdings
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {roleRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-[#161B22] border border-[#2F3336] rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-mono font-semibold">{rule.name}</h3>
                      <span className="text-xs text-gray-500 font-mono px-2 py-1 bg-[#2F3336] rounded">
                        {getRuleTypeLabel(rule.ruleType)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono mt-1">
                      {getRuleDescription(rule)}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      Discord Role ID: {rule.discordRoleId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-[#2F3336]"
                      onClick={() => handleOpenDialog(rule)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-[#2F3336]"
                      onClick={() => handleOpenDeleteDialog(rule)}
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
        <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingRoleRule ? 'Edit Role Rule' : 'Add Role Rule'}
            </DialogTitle>
            <DialogDescription className="text-gray-400 font-mono">
              {editingRoleRule 
                ? 'Update the role assignment rule configuration'
                : 'Create a new rule for automatic Discord role assignment'
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
                Rule Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Gold Tier Holder"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discordRoleId" className="text-gray-300 font-mono">
                Discord Role ID *
              </Label>
              <Input
                id="discordRoleId"
                placeholder="e.g., 1234567890123456789"
                value={formData.discordRoleId}
                onChange={(e) => setFormData({ ...formData, discordRoleId: e.target.value })}
                className="bg-[#161B22] border-[#2F3336] text-white font-mono"
              />
              <p className="text-xs text-gray-500 font-mono">
                Right-click a role in Discord and select "Copy ID" (Developer Mode must be enabled)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleType" className="text-gray-300 font-mono">
                Rule Type *
              </Label>
              <Select
                value={formData.ruleType}
                onValueChange={handleRuleTypeChange}
              >
                <SelectTrigger className="bg-[#161B22] border-[#2F3336] text-white font-mono">
                  <SelectValue placeholder="Select a rule type" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#2F3336] text-white">
                  <SelectItem value="individual_contract" className="font-mono">
                    Individual Contract - Minimum NFTs from one collection
                  </SelectItem>
                  <SelectItem value="multi_contract" className="font-mono">
                    Multi Contract - Own from any/all collections
                  </SelectItem>
                  <SelectItem value="nft_threshold" className="font-mono">
                    NFT Threshold - Total NFTs across collections
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.ruleType && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-mono">
                    NFT Collections *
                  </Label>
                  <div className="border border-[#2F3336] rounded-lg p-4 bg-[#161B22] max-h-48 overflow-y-auto">
                    {collections.length === 0 ? (
                      <p className="text-sm text-gray-500 font-mono">
                        No collections available. Add collections first.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {collections.map((collection) => (
                          <div key={collection.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={`collection-${collection.id}`}
                              checked={formData.contracts.includes(collection.id)}
                              onCheckedChange={(checked) => 
                                handleCollectionToggle(collection.id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <label
                              htmlFor={`collection-${collection.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="text-sm text-white font-mono">{collection.name}</div>
                              <div className="text-xs text-gray-500 font-mono">
                                {collection.chain.name} - {collection.contractAddress.slice(0, 10)}...
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(formData.ruleType === 'individual_contract' || formData.ruleType === 'nft_threshold') && (
                  <div className="space-y-2">
                    <Label htmlFor="threshold" className="text-gray-300 font-mono">
                      Minimum NFT Count *
                    </Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="1"
                      placeholder="e.g., 1"
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                      className="bg-[#161B22] border-[#2F3336] text-white font-mono"
                    />
                    <p className="text-xs text-gray-500 font-mono">
                      {formData.ruleType === 'individual_contract' 
                        ? 'Minimum number of NFTs required from the selected collection'
                        : 'Total minimum number of NFTs required across all selected collections'
                      }
                    </p>
                  </div>
                )}

                {formData.ruleType === 'multi_contract' && (
                  <div className="space-y-2">
                    <Label htmlFor="requirementType" className="text-gray-300 font-mono">
                      Requirement Type *
                    </Label>
                    <Select
                      value={formData.requirementType}
                      onValueChange={(value) => setFormData({ ...formData, requirementType: value as 'any' | 'all' })}
                    >
                      <SelectTrigger className="bg-[#161B22] border-[#2F3336] text-white font-mono">
                        <SelectValue placeholder="Select requirement type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161B22] border-[#2F3336] text-white">
                        <SelectItem value="any" className="font-mono">
                          Any - Own NFTs from at least one collection
                        </SelectItem>
                        <SelectItem value="all" className="font-mono">
                          All - Own NFTs from every collection
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
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
              {isSubmitting ? 'Saving...' : editingRoleRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">Delete Role Rule</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 font-mono">
              Are you sure you want to delete "{deletingRoleRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-transparent border-[#2F3336] text-gray-400 hover:text-white font-mono"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingRoleRule(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-mono"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

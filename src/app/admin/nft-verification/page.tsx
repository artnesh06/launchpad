'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare02Icon, Layers01Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons';
import { ChainConfigPanel } from '@/components/admin/nft-verification/ChainConfigPanel';
import { CollectionConfigPanel } from '@/components/admin/nft-verification/CollectionConfigPanel';
import { RoleRulesConfigPanel } from '@/components/admin/nft-verification/RoleRulesConfigPanel';

export default function NFTVerificationAdminPage() {
  const [activeTab, setActiveTab] = useState('chains');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-mono">
            NFT Holder Verification
          </h1>
          <p className="text-gray-400 font-mono">
            Configure blockchain networks, NFT collections, and role assignment rules
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#1E1F22] border border-[#2F3336]">
          <TabsTrigger
            value="chains"
            className="data-[state=active]:bg-[#B392F0] data-[state=active]:text-white font-mono"
          >
            <HugeiconsIcon icon={LinkSquare02Icon} size={16} className="mr-2" />
            Chains
          </TabsTrigger>
          <TabsTrigger
            value="collections"
            className="data-[state=active]:bg-[#B392F0] data-[state=active]:text-white font-mono"
          >
            <HugeiconsIcon icon={Layers01Icon} size={16} className="mr-2" />
            Collections
          </TabsTrigger>
          <TabsTrigger
            value="role-rules"
            className="data-[state=active]:bg-[#B392F0] data-[state=active]:text-white font-mono"
          >
            <HugeiconsIcon icon={UserMultiple02Icon} size={16} className="mr-2" />
            Role Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chains" className="space-y-4">
          <ChainConfigPanel />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <CollectionConfigPanel />
        </TabsContent>

        <TabsContent value="role-rules" className="space-y-4">
          <RoleRulesConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { WalletConnectionHeader } from '@/components/wallet-connection-header';

export default function WalletVerificationDemo() {
  return (
    <div className="min-h-screen bg-[#0D0E11] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white font-mono">
            NFT Holder Verification Demo
          </h1>
          <p className="text-gray-400 font-mono">
            Test the wallet connection and Discord linking
          </p>
        </div>

        {/* Demo Header */}
        <div className="bg-[#1E1F22] border border-[#2F3336] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white font-mono mb-4">
            Wallet Connection Header
          </h2>
          <div className="flex justify-end">
            <WalletConnectionHeader />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#1E1F22] border border-[#2F3336] rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white font-mono">
            Test Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300 font-mono text-sm">
            <li>Click "Connect Wallet" to initiate wallet connection</li>
            <li>Select your wallet provider (MetaMask, WalletConnect, etc.)</li>
            <li>Once connected, you should see your wallet address</li>
            <li>Click on the wallet address to open the dropdown menu</li>
            <li>Click "Link Wallet" to open the Discord linking modal</li>
            <li>Click "Connect Discord" to authenticate with Discord</li>
            <li>After Discord auth, click "Add Current Wallet" to link your wallet</li>
            <li>Sign the message to verify wallet ownership</li>
            <li>Test removing linked wallets</li>
            <li>Test the "Disconnect" option to disconnect your wallet</li>
          </ol>
        </div>

        {/* Requirements Validation */}
        <div className="bg-[#1E1F22] border border-[#2F3336] rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white font-mono">
            Task 7.1 Requirements Checklist
          </h2>
          <ul className="space-y-2 text-gray-300 font-mono text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Modal open/close functionality</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Discord OAuth button and flow</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Display authenticated Discord user info</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>List all linked wallets with remove buttons</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>"Add Current Wallet" with signature request</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

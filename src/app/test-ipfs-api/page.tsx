'use client';

import { useState } from 'react';
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';
import { ipfsToHttpViaApi } from '@/lib/ipfs-utils';

export default function TestIpfsApiPage() {
  const [inputUri, setInputUri] = useState('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
  const [testUri, setTestUri] = useState('');
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Test dengan hook
  const { httpUrl, loading: hookLoading, error } = useIpfsToHttp(testUri);

  // Test dengan API langsung
  const handleTestApi = async () => {
    setLoading(true);
    try {
      const result = await ipfsToHttpViaApi(inputUri);
      setApiResult(result);
    } catch (err) {
      console.error('Error:', err);
      setApiResult('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E11] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Test IPFS to HTTP API</h1>

        {/* Test dengan Hook */}
        <div className="bg-[#1E1F22] p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold text-white">Test dengan useIpfsToHttp Hook</h2>
          
          <div className="space-y-2">
            <label className="text-white text-sm">IPFS URI:</label>
            <input
              type="text"
              value={inputUri}
              onChange={(e) => setInputUri(e.target.value)}
              className="w-full bg-[#0D0E11] text-white p-3 rounded border border-[#2D253E]"
              placeholder="ipfs://QmXxxx..."
            />
          </div>

          <button
            onClick={() => setTestUri(inputUri)}
            className="bg-[#B392F0] text-white px-6 py-2 rounded hover:bg-[#9370DB] transition-colors"
          >
            Test Hook
          </button>

          {hookLoading && <p className="text-yellow-500">Loading...</p>}
          {error && <p className="text-red-500">Error: {error.message}</p>}
          {httpUrl && (
            <div className="space-y-2">
              <p className="text-green-500">✓ Success!</p>
              <div className="bg-[#0D0E11] p-3 rounded">
                <p className="text-white text-sm break-all">{httpUrl}</p>
              </div>
              {httpUrl.includes('http') && (
                <img 
                  src={httpUrl} 
                  alt="IPFS Image" 
                  className="max-w-md rounded border border-[#2D253E]"
                />
              )}
            </div>
          )}
        </div>

        {/* Test dengan API Function */}
        <div className="bg-[#1E1F22] p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold text-white">Test dengan ipfsToHttpViaApi Function</h2>
          
          <button
            onClick={handleTestApi}
            disabled={loading}
            className="bg-[#B392F0] text-white px-6 py-2 rounded hover:bg-[#9370DB] transition-colors disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test API Function'}
          </button>

          {apiResult && (
            <div className="space-y-2">
              <p className="text-green-500">✓ Result:</p>
              <div className="bg-[#0D0E11] p-3 rounded">
                <p className="text-white text-sm break-all">{apiResult}</p>
              </div>
              {apiResult.includes('http') && (
                <img 
                  src={apiResult} 
                  alt="IPFS Image" 
                  className="max-w-md rounded border border-[#2D253E]"
                />
              )}
            </div>
          )}
        </div>

        {/* Test dengan Fetch Langsung */}
        <div className="bg-[#1E1F22] p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold text-white">Test dengan Fetch API Langsung</h2>
          
          <div className="space-y-2">
            <p className="text-white text-sm">Clean URL Pattern:</p>
            <code className="block bg-[#0D0E11] p-3 rounded text-green-400 text-xs overflow-x-auto">
              {`fetch('/api/ipfs/${encodeURIComponent(inputUri)}')`}
            </code>
          </div>

          <div className="space-y-2">
            <p className="text-white text-sm">Example dengan hash langsung:</p>
            <code className="block bg-[#0D0E11] p-3 rounded text-green-400 text-xs overflow-x-auto">
              {`fetch('/api/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')`}
            </code>
          </div>
        </div>

        {/* Example URIs */}
        <div className="bg-[#1E1F22] p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold text-white">Example IPFS URIs</h2>
          <div className="space-y-2">
            <button
              onClick={() => setInputUri('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')}
              className="block w-full text-left bg-[#0D0E11] p-3 rounded text-white text-sm hover:bg-[#2D253E] transition-colors"
            >
              ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
            </button>
            <button
              onClick={() => setInputUri('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')}
              className="block w-full text-left bg-[#0D0E11] p-3 rounded text-white text-sm hover:bg-[#2D253E] transition-colors"
            >
              QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG (without protocol)
            </button>
            <button
              onClick={() => setInputUri('https://example.com/image.png')}
              className="block w-full text-left bg-[#0D0E11] p-3 rounded text-white text-sm hover:bg-[#2D253E] transition-colors"
            >
              https://example.com/image.png (already HTTP)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

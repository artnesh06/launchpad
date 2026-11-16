'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHomepageSocket } from '@/hooks/useHomepageSocket';

interface MintsData {
  date: string;
  mints: number;
}

interface MintsOverTimeChartProps {
  chainFilter?: number | 'all';
}

export function MintsOverTimeChart({ chainFilter = 'all' }: MintsOverTimeChartProps) {
  const [data, setData] = React.useState<MintsData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // WebSocket hook for real-time mint updates
  const { latestMint, isConnected: wsConnected } = useHomepageSocket({
    chainFilter: chainFilter,
    enabled: true,
  });

  // Fetch initial data
  React.useEffect(() => {
    const fetchMintsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build URL dengan chain filter jika ada
        const chainParam = chainFilter === 'all' ? 'all' : chainFilter.toString();
        const url = `/api/activity/mints-chart?days=7&chain=${chainParam}`;
        
        // Fetch data dari API mints-chart untuk mendapatkan data 24 jam terakhir
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          console.error('Failed to fetch mints chart data:', result.error);
          setError(result.error || 'Failed to load chart data');
          setData([]);
        }
      } catch (error) {
        console.error('Failed to fetch mints data:', error);
        setError('Failed to load chart data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMintsData();
  }, [chainFilter]);

  // Update chart data when new mint event received via WebSocket
  React.useEffect(() => {
    if (!latestMint) return;

    console.log('[MintsOverTimeChart] New mint event received:', latestMint);

    // Get today's date in the same format as API data
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });

    setData(prevData => {
      if (prevData.length === 0) return prevData;

      // Find today's entry and increment mints count
      const updatedData = prevData.map((item, index) => {
        // Check if this is the last item (today) or matches today's date
        const isToday = index === prevData.length - 1 || item.date === todayStr;
        
        if (isToday) {
          return {
            ...item,
            mints: item.mints + (latestMint.quantity || 1)
          };
        }
        return item;
      });

      return updatedData;
    });
  }, [latestMint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#A9ABAF] font-mono text-sm">Loading chart...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <svg 
          className="w-16 h-16 text-[#F87683]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <div className="text-center">
          <p className="text-[#F87683] font-mono text-sm mb-1">Failed to load chart</p>
          <p className="text-[#6A7282] font-mono text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state when no data
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <svg 
          className="w-16 h-16 text-[#2F3336]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
        <div className="text-center">
          <p className="text-[#A9ABAF] font-mono text-sm mb-1">No mint data available</p>
          <p className="text-[#6A7282] font-mono text-xs">Check back later for mint activity</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: -25, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorMints" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B392F0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#B392F0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1F22" vertical={false} />
        <XAxis 
          dataKey="date" 
          tick={false}
          axisLine={false}
        />
        <YAxis 
          tick={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E192B',
            border: '1px solid #1E1F22',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#F7F8FB' }}
          itemStyle={{ color: '#B392F0' }}
        />
        <Area
          type="monotone"
          dataKey="mints"
          stroke="#B392F0"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorMints)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

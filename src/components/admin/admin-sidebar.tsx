'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DashboardSquare01Icon,
  FactoryIcon,
  UserMultiple01Icon,
  Settings01Icon,
  BarChartIcon,
  Wallet01Icon,
  FileTextIcon,
  Shield01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Alert01Icon
} from '@hugeicons/core-free-icons';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOwner: boolean;
  userAddress?: string;
  className?: string;
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  isOwner,
  userAddress,
  className
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: DashboardSquare01Icon,
      description: 'Overview & Analytics'
    },
    {
      id: 'launchpads',
      label: 'Launchpads',
      icon: FactoryIcon,
      description: 'Manage Collections'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChartIcon,
      description: 'Performance Metrics'
    },
    {
      id: 'users',
      label: 'Users',
      icon: UserMultiple01Icon,
      description: 'Creator Management'
    },
    ...(isOwner ? [{
      id: 'admin',
      label: 'Admin Controls',
      icon: Shield01Icon,
      description: 'System Settings',
      danger: true
    }] : []),
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings01Icon,
      description: 'Configuration'
    }
  ];

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">NFT Launchpad</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && userAddress && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">Connected</Badge>
                {isOwner && (
                  <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500">
                    Owner
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-auto p-3 text-left",
                collapsed ? "px-3" : "px-3",
                isActive && "bg-primary/10 text-primary border-primary/20",
                item.danger && "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0",
                item.danger && "text-red-500",
                collapsed ? "mx-auto" : "mr-3"
              )} />

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    {item.danger && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p>Version 1.0.0</p>
            <p className="mt-1">© 2024 ODDS Launchpad</p>
          </div>
        </div>
      )}
    </div>
  );
}
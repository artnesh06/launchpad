'use client';

import { ReactNode } from 'react';

interface NavigationProps {
  children: ReactNode;
  className?: string;
}

interface NavigationItemProps {
  href: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
}

export function Navigation({ children, className = '' }: NavigationProps) {
  return (
    <nav className={`flex items-center space-x-6 ${className}`}>
      {children}
    </nav>
  );
}

export function NavigationItem({
  href,
  children,
  className = '',
  active = false
}: NavigationItemProps) {
  const baseClasses = 'text-base transition-colors font-mono';
  const activeClasses = active
    ? 'text-[#B392F0] font-bold'
    : 'text-[#857F94] hover:text-white font-medium';

  return (
    <a
      href={href}
      className={`${baseClasses} ${activeClasses} ${className}`}
    >
      {children}
    </a>
  );
}
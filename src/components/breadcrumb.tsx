import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm font-mono">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link 
                href={item.href}
                className="text-[#99A1AF] hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-white' : 'text-[#99A1AF]'}>
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-[#505052]" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

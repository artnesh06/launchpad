'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';
interface NFTFeaturedCardProps {
  title: string;
  creator: string;
  platform: string;
  image: string;
  bgColor: string;
  isFeatured?: boolean;
}

export function NFTFeaturedCard({ 
  title, 
  creator, 
  platform, 
  image, 
  bgColor,
  isFeatured = false 
}: NFTFeaturedCardProps) {
  return (
    <Button variant="ghost" className="p-0 h-auto w-full block" asChild>
      <Card className="relative overflow-hidden border-0 bg-transparent group cursor-pointer">
        {/* Featured Badge */}
        {isFeatured && (
          <Badge className="absolute top-3 left-3 z-10 bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1">
            <HugeiconsIcon icon={StarIcon} size={12} className="mr-1 fill-current" />
            Featured Spot
          </Badge>
        )}
      </Card>
    </Button>
  );
}
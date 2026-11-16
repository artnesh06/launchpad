'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Upload01Icon,
  Image01Icon,
  Cancel01Icon
} from '@hugeicons/core-free-icons';

interface ProfileAsset {
  id: string;
  name: string;
  type: 'cover' | 'profile';
  url?: string;
  file?: File;
  size: number;
}

interface ProfileAssetsProps {
  data: {
    coverCollection: ProfileAsset | null;
    profileCollection: ProfileAsset | null;
  };
  onChange: (data: any) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function ProfileAssets({
  data,
  onChange,
  isExpanded = true,
  onToggle
}: ProfileAssetsProps) {
  const [dragOver, setDragOver] = useState<'cover' | 'profile' | null>(null);

  const handleFileUpload = useCallback((file: File, type: 'cover' | 'profile') => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file', { id: TOAST_ID });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB', { id: TOAST_ID });
      return;
    }

    const newAsset: ProfileAsset = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type,
      file,
      size: file.size,
      url: URL.createObjectURL(file)
    };

    const fieldName = type === 'cover' ? 'coverCollection' : 'profileCollection';
    onChange({
      ...data,
      [fieldName]: newAsset
    });
  }, [data, onChange]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'cover' | 'profile') => {
    e.preventDefault();
    setDragOver(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0], type);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent, type: 'cover' | 'profile') => {
    e.preventDefault();
    setDragOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  }, []);

  const removeAsset = (type: 'cover' | 'profile') => {
    const fieldName = type === 'cover' ? 'coverCollection' : 'profileCollection';
    // Revoke object URL to prevent memory leaks
    if (data[fieldName]?.url) {
      URL.revokeObjectURL(data[fieldName]!.url!);
    }
    onChange({
      ...data,
      [fieldName]: null
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const AssetUploadArea = ({
    type,
    title,
    description,
    dimensions,
    asset
  }: {
    type: 'cover' | 'profile';
    title: string;
    description: string;
    dimensions: string;
    asset: ProfileAsset | null;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-sm font-medium">{title}</h5>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {dimensions}
        </Badge>
      </div>

      {asset ? (
        // Display uploaded asset
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <img
            src={asset.url}
            alt={asset.name}
            className={`w-full object-cover ${type === 'cover' ? 'h-32' : 'h-48'
              }`}
          />

          {/* Overlay with asset info and remove button */}
          <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-sm font-medium mb-2">{asset.name}</p>
              <p className="text-xs mb-4">{formatFileSize(asset.size)}</p>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeAsset(type)}
                className="bg-red-600 hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Upload area
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragOver === type
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${type === 'cover' ? 'h-32' : 'h-48'} flex flex-col items-center justify-center`}
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={(e) => handleDragOver(e, type)}
          onDragLeave={handleDragLeave}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileUpload(file, type);
            };
            input.click();
          }}
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">
            Drag & drop {type} image
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            or click to browse
          </p>
          <Badge variant="outline" className="text-xs">
            Max 10MB
          </Badge>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cover Collection */}
      <Card className="border-2 border-border/50 hover:border-border transition-colors">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h5 className="text-lg font-semibold">Cover Collection</h5>
              <p className="text-xs text-muted-foreground">Banner image displayed on your collection page</p>
            </div>
            <Badge variant={data.coverCollection ? "default" : "secondary"} className="text-xs px-2 py-1">
              {data.coverCollection ? "✓ Uploaded" : "Optional"}
            </Badge>
          </div>

          <AssetUploadArea
            type="cover"
            title="Collection Cover"
            description="Cover image for your collection"
            dimensions="Recommended: 1400x400px"
            asset={data.coverCollection}
          />
        </div>
      </Card>

      {/* Profile Collection */}
      <Card className="border-2 border-border/50 hover:border-border transition-colors">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h5 className="text-lg font-semibold">Profile Collection</h5>
              <p className="text-xs text-muted-foreground">Profile image used as your collection avatar</p>
            </div>
            <Badge variant={data.profileCollection ? "default" : "secondary"} className="text-xs px-2 py-1">
              {data.profileCollection ? "✓ Uploaded" : "Optional"}
            </Badge>
          </div>

          <AssetUploadArea
            type="profile"
            title="Collection Profile"
            description="Profile image for your collection"
            dimensions="Recommended: 400x400px"
            asset={data.profileCollection}
          />
        </div>
      </Card>

      {/* Upload Summary */}
      {(data.coverCollection || data.profileCollection) && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="p-4">
            <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-xs">📸</span>
              </div>
              Upload Summary
            </h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${data.coverCollection ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <span className={data.coverCollection ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}>
                  Cover Image
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${data.profileCollection ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <span className={data.profileCollection ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}>
                  Profile Image
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}



'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  ArrowUp01Icon, 
  ArrowDown01Icon, 
  Upload01Icon, 
  Image01Icon, 
  FileTextIcon,
  Delete02Icon,
  Link01Icon
} from '@hugeicons/core-free-icons';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'metadata';
  url?: string;
  file?: File;
  size: number;
}

interface MediaAssetsProps {
  data: {
    nftMedia: MediaFile[];
    nftMetadata: MediaFile[];
    uploadMethod: 'manual' | 'ipfs' | 'thirdparty';
  };
  onChange: (data: any) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function MediaAssets({ 
  data, 
  onChange, 
  isExpanded = true, 
  onToggle 
}: MediaAssetsProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback((files: FileList | null, type: 'image' | 'metadata') => {
    if (!files) return;

    const newFiles: MediaFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type,
      file,
      size: file.size,
      url: URL.createObjectURL(file)
    }));

    const fieldName = type === 'image' ? 'nftMedia' : 'nftMetadata';
    onChange({
      ...data,
      [fieldName]: [...data[fieldName], ...newFiles]
    });
  }, [data, onChange]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'image' | 'metadata') => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files, type);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = (id: string, type: 'image' | 'metadata') => {
    const fieldName = type === 'image' ? 'nftMedia' : 'nftMetadata';
    const updatedFiles = data[fieldName].filter((file: MediaFile) => file.id !== id);
    onChange({
      ...data,
      [fieldName]: updatedFiles
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const UploadArea = ({ type, title, description, accept, files }: {
    type: 'image' | 'metadata';
    title: string;
    description: string;
    accept: string;
    files: MediaFile[];
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">{title}</h5>
        <Badge variant="outline" className="text-xs">
          {files.length} files
        </Badge>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={(e) => handleDrop(e, type)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center gap-4">
          {type === 'image' ? (
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          ) : (
            <FileText className="w-12 h-12 text-muted-foreground" />
          )}
          
          <div>
            <p className="text-sm font-medium mb-1">
              Drag & drop {type === 'image' ? 'images' : 'metadata files'} here
            </p>
            <p className="text-xs text-muted-foreground mb-4">{description}</p>
            
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept={accept}
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, type)}
              />
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {type === 'image' ? (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {file.url && (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : (
                  <FileText className="w-6 h-6 text-muted-foreground" />
                )}
                
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id, type)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">
            3
          </div>
          <h4 className="text-lg font-semibold">Media Assets</h4>
        </div>
        {onToggle && (
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Upload your NFT media (e.g. images, videos) and the corresponding metadata. This is suitable for a single, non-generative NFT.
          </div>

          {/* Upload Method Selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Choose Upload Method
            </label>
            <div className="flex gap-2">
              <Button
                variant={data.uploadMethod === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange({ ...data, uploadMethod: 'manual' })}
              >
                <Upload className="w-4 h-4 mr-2" />
                Manual Upload
              </Button>
              <Button
                variant={data.uploadMethod === 'ipfs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange({ ...data, uploadMethod: 'ipfs' })}
              >
                <Link className="w-4 h-4 mr-2" />
                Use IPFS CID
              </Button>
              <Button
                variant={data.uploadMethod === 'thirdparty' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange({ ...data, uploadMethod: 'thirdparty' })}
              >
                Upload per Traits
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NFT Media Upload */}
            <UploadArea
              type="image"
              title="NFT Media"
              description="Drag & drop Image, Video, Audio files. Max 50mb"
              accept="image/*,video/*,audio/*"
              files={data.nftMedia}
            />

            {/* NFT Metadata Upload */}
            <UploadArea
              type="metadata"
              title="NFT Metadata"
              description="Drag & drop NFT Metadata files. Max 10mb"
              accept=".json,.txt"
              files={data.nftMetadata}
            />
          </div>

          {/* Upload Summary */}
          {(data.nftMedia.length > 0 || data.nftMetadata.length > 0) && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="text-sm font-medium mb-2">Upload Summary</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Media Files:</span>
                  <p className="font-medium">{data.nftMedia.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Metadata Files:</span>
                  <p className="font-medium">{data.nftMetadata.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Size:</span>
                  <p className="font-medium">
                    {formatFileSize([...data.nftMedia, ...data.nftMetadata].reduce((acc, file) => acc + file.size, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation indicators */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={data.nftMedia.length > 0 ? "default" : "secondary"} className="px-2 py-1">
              {data.nftMedia.length > 0 ? "✓" : "○"} Media Files
            </Badge>
            <Badge variant={data.nftMetadata.length > 0 ? "default" : "secondary"} className="px-2 py-1">
              {data.nftMetadata.length > 0 ? "✓" : "○"} Metadata Files
            </Badge>
            <Badge variant="secondary" className="px-2 py-1">
              Method: {data.uploadMethod}
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}
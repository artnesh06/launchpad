'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload01Icon, Loading01Icon, Link01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ImageUrlUploadProps {
  label: string;
  value?: string;
  onValueChange?: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  height?: string;
  hasError?: boolean;
  required?: boolean;
}

export const ImageUrlUpload: React.FC<ImageUrlUploadProps> = ({
  label,
  value = '',
  onValueChange,
  onFileSelect,
  accept = "image/*",
  maxSize = 10,
  className,
  height = "h-[237px]",
  hasError = false,
  required = false
}) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value);

  // Update preview when value changes (for URL mode)
  useEffect(() => {
    if (mode === 'url' && value && value !== urlInput) {
      setUrlInput(value);
      setPreview(value);
    }
  }, [value, mode]);

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const validateFile = (file: File): boolean => {
    setError('');

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }

    // Check file type
    if (accept && !file.type.match(accept.replace('*', ''))) {
      setError('Invalid file type');
      return false;
    }

    return true;
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    const { ipfsService } = await import('@/lib/ipfs-service');
    
    try {
      const result = await ipfsService.uploadFile(file);
      return result.ipfsUrl;
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error(`Failed to upload ${file.name} to IPFS`);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (validateFile(file)) {
      setIsProcessing(true);
      setSelectedFile(file);

      // Create preview for image files
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
        setIsProcessing(false);
      }

      // Upload to IPFS
      try {
        setIsUploading(true);
        const ipfsUrl = await uploadToIPFS(file);
        onValueChange?.(ipfsUrl);
        onFileSelect?.(file);
        setIsUploading(false);
      } catch (err) {
        setError('Failed to upload to IPFS');
        setIsUploading(false);
        setSelectedFile(null);
        setPreview(null);
        onFileSelect?.(null);
      }
    } else {
      setSelectedFile(null);
      setPreview(null);
      setIsProcessing(false);
      onFileSelect?.(null);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    onValueChange?.(url);
    if (url) {
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleClearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    setUrlInput('');
    onValueChange?.('');
    onFileSelect?.(null);
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'url' | 'upload');
    handleClearPreview();
    setError('');
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="font-mono">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#1E1F22]">
          <TabsTrigger value="url" className="font-mono">
            <HugeiconsIcon icon={Link01Icon} size={16} className="mr-2" />
            URL
          </TabsTrigger>
          <TabsTrigger value="upload" className="font-mono">
            <HugeiconsIcon icon={Upload01Icon} size={16} className="mr-2" />
            Upload to IPFS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-2">
          <Input
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://... or ipfs://..."
            className={cn(
              "bg-[#1E1F22] border-[#2D2E32] text-white font-mono",
              hasError && "border-red-500"
            )}
          />
          
          {preview && (
            <div className="relative w-full rounded-lg overflow-hidden border border-[#2D2E32]" style={{ height }}>
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleClearPreview}
                className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-white" />
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <div
            className={cn(
              "w-full bg-[#1E1F22] border-2 border-dashed rounded-lg cursor-pointer transition-colors relative overflow-hidden",
              height,
              hasError
                ? "border-red-500 bg-red-950/20"
                : isDragOver
                  ? "border-[#A080E0] bg-[#2A1F32]"
                  : "border-[#B392F0]"
            )}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !isUploading && document.getElementById(`file-input-${label}`)?.click()}
          >
            {preview ? (
              <div className="relative w-full h-full">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg"
                />
                {isUploading ? (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                    <HugeiconsIcon icon={Loading01Icon} size={32} className="text-[#B392F0] animate-spin mb-2" />
                    <p className="text-white font-mono text-sm">Uploading to IPFS...</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[#1E1F22] flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 bg-[#B392F0] rounded flex items-center justify-center mb-2">
                      <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
                    </div>
                    <p className="text-white font-mono text-sm font-medium">Change Image</p>
                    <p className="text-[#857F94] font-mono text-sm">{selectedFile?.name}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearPreview();
                      }}
                      className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-xs font-mono"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 h-full p-4">
                <div className="w-8 h-8 bg-[#B392F0] rounded flex items-center justify-center">
                  {isProcessing || isUploading ? (
                    <HugeiconsIcon icon={Loading01Icon} size={16} className="text-[#0D0E11] animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
                  )}
                </div>

                <div className="text-center space-y-1">
                  {isUploading ? (
                    <p className="text-[#B392F0] font-mono text-sm font-medium">Uploading to IPFS...</p>
                  ) : isProcessing ? (
                    <p className="text-[#B392F0] font-mono text-sm font-medium">Processing...</p>
                  ) : selectedFile ? (
                    <>
                      <p className="text-green-500 font-mono text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-[#857F94] font-mono text-sm">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-mono text-sm font-medium">Choose Image</p>
                      <p className="text-[#857F94] font-mono text-sm">Drag here or click to upload</p>
                      <p className="text-[#857F94] font-mono text-xs">Will be uploaded to IPFS</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <input
              id={`file-input-${label}`}
              type="file"
              accept={accept}
              onChange={onInputChange}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {error && (
            <p className="text-red-500 font-mono text-sm text-center">{error}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

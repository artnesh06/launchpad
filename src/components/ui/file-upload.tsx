'use client';

import React, { useCallback, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  onFileSelect?: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  height?: string;
  hasError?: boolean; // For validation error state
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onFileSelect,
  accept = "image/*",
  maxSize = 10,
  className,
  height = "h-[237px]",
  hasError = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cleanup preview URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (preview) {
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

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setIsProcessing(true);
      setSelectedFile(file);
      onFileSelect?.(file);

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

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-[#B392F0] font-mono font-bold text-[15px] text-center">
        {label}
      </label>

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
        onClick={() => document.getElementById(`file-input-${label}`)?.click()}
      >
        {preview ? (
          // Image Preview
          <div className="relative w-full h-full">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-[#1E1F22] flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 bg-[#B392F0] rounded flex items-center justify-center mb-2">
                <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
              </div>
              <p className="text-white font-mono text-sm font-medium">Change Image</p>
              <p className="text-[#857F94] font-mono text-sm">{selectedFile?.name}</p>
            </div>
          </div>
        ) : (
          // Default Upload UI
          <div className="flex flex-col items-center justify-center space-y-2 h-full p-4">
            <div className="w-8 h-8 bg-[#B392F0] rounded flex items-center justify-center">
              {isProcessing ? (
                <HugeiconsIcon icon={Loading01Icon} size={16} className="text-[#0D0E11] animate-spin" />
              ) : (
                <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
              )}
            </div>

            <div className="text-center space-y-1">
              {isProcessing ? (
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
                  <p className="text-[#857F94] font-mono text-sm">Drag here</p>
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
        />
      </div>

      {error && (
        <p className="text-red-500 font-mono text-sm text-center">{error}</p>
      )}
    </div>
  );
};
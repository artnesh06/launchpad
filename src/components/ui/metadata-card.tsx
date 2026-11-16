'use client';

import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick01Icon, Upload01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface MetadataCardProps {
  type: 'open' | 'standard';
  title: string;
  description: string;
  emoji: string;
  isSelected: boolean;
  onClick: () => void;
  onFileSelect?: (file: File | null) => void;
}

export const MetadataCard: React.FC<MetadataCardProps> = ({
  type,
  title,
  description,
  emoji,
  isSelected,
  onClick,
  onFileSelect
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect?.(file);

    // Create preview for image files
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card selection when clicking on file input area
    if ((e.target as HTMLElement).closest('.file-upload-area')) {
      return;
    }
    onClick();
  };

  return (
    <div
      className={cn(
        "bg-[#0D0E11] border rounded cursor-pointer transition-all duration-200 h-[238px]",
        isSelected ? "border-[#B392F0]" : "border-[#2F3336]"
      )}
      onClick={handleCardClick}
    >
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-start gap-4 mb-4 flex-1">
          {type === 'standard' ? (
            <div className="grid grid-cols-2 gap-1 text-[26px] w-[55px] h-[56px]">
              <span className="text-[25px] leading-[29px]">🖼️</span>
              <span className="text-[25px] leading-[29px]">🖼️</span>
              <span className="text-[25px] leading-[29px]">🖼️</span>
              <span className="text-[25px] leading-[29px]">🖼️</span>
            </div>
          ) : (
            <div className="text-[54px] leading-[62px] w-[58px] h-[62px]">{emoji}</div>
          )}

          <div className="flex-1">
            <h3 className="text-[#B392F0] font-mono font-bold text-[14px] leading-[16px] mb-2">{title}</h3>
            <p className="text-[#505052] font-mono text-[14px] leading-[20px]">
              {description.split('\\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < description.split('\\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          </div>

          {isSelected && (
            <div className="w-[29px] h-[29px] bg-[#0D3323] rounded-full flex items-center justify-center">
              <HugeiconsIcon icon={Tick01Icon} className="w-[15px] h-[10px] text-[#25D663] stroke-[3px]" />
            </div>
          )}
        </div>

        {isSelected && (
          <div className="space-y-2 file-upload-area">
            <label className="block text-[#B392F0] font-mono font-bold text-[14px] leading-[16px]">
              {type === 'standard' ? 'Upload Metadata/Image' : 'Upload Image'}
            </label>
            <div className="bg-[#1E1F22] border-2 border-dashed border-[#B392F0] rounded-lg relative overflow-hidden h-[156px]">
              {preview ? (
                // Image Preview
                <div className="relative h-full">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-[#1E1F22] flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 bg-[#B392F0] rounded mb-2 flex items-center justify-center">
                      <HugeiconsIcon icon={Upload01Icon} size={12} className="text-[#0D0E11]" />
                    </div>
                    <p className="text-white font-mono text-sm">Change Image</p>
                    <p className="text-[#857F94] font-mono text-xs">{selectedFile?.name}</p>
                  </div>
                </div>
              ) : (
                // Default Upload UI
                <div className="h-full flex flex-col items-center justify-center p-4">
                  <div className="w-[29px] h-[29px] bg-[#B392F0] rounded mb-2 flex items-center justify-center">
                    <HugeiconsIcon icon={Upload01Icon} size={16} className="text-[#0D0E11]" />
                  </div>
                  <div className="text-center space-y-1">
                    {selectedFile ? (
                      <>
                        <p className="text-green-500 font-mono text-sm">{selectedFile.name}</p>
                        <p className="text-[#857F94] font-mono text-sm">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white font-mono text-[14px] leading-[16px] font-medium">Choose file</p>
                        <p className="text-[#857F94] font-mono text-[14px] leading-[16px]">Drag here</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.json,.zip"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
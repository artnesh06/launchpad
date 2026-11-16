'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  ({
    label,
    error,
    containerClassName,
    labelClassName,
    inputClassName,
    className,
    ...props
  }, ref) => {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <label className={cn(
            "block text-[#B392F0] font-mono font-bold text-[15px]",
            labelClassName
          )}>
            {label}
          </label>
        )}
        <div className="h-[42px] bg-[#0D0E11] border border-[#2F3336] rounded">
          <input
            ref={ref}
            className={cn(
              "w-full h-full bg-transparent px-3 text-[#857F94] font-mono text-[15px] outline-none placeholder:text-[#857F94]",
              inputClassName,
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-red-500 font-mono text-sm">{error}</p>
        )}
      </div>
    );
  }
);

CustomInput.displayName = "CustomInput";
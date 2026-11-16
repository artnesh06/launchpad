'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

/**
 * Animated counter component that smoothly transitions between values
 */
export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  className = '',
  formatter = (v) => v.toLocaleString()
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // Skip if value hasn't changed
    if (value === previousValueRef.current) {
      return;
    }

    setIsAnimating(true);
    const startValue = previousValueRef.current;
    const endValue = value;
    const difference = endValue - startValue;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (difference * easeOut);
      
      // Don't round for decimal values - preserve precision
      // Only round for integers (values >= 1)
      if (Math.abs(endValue) >= 1 && Number.isInteger(endValue)) {
        setDisplayValue(Math.round(currentValue));
      } else {
        setDisplayValue(currentValue);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        startTimeRef.current = undefined;
        previousValueRef.current = value;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span 
      className={`${className} ${isAnimating ? 'text-[#05DF72] transition-colors duration-300' : ''}`}
    >
      {formatter(displayValue)}
    </span>
  );
}

/**
 * Trigger celebration confetti effect
 * Uses canvas-confetti loaded via CDN in layout
 */
export function triggerConfetti(options?: {
  duration?: number;
  colors?: string[];
}) {
  if (typeof window === 'undefined' || !(window as any).confetti) return;
  
  const duration = options?.duration || 1500;
  const colors = options?.colors || ['#B392F0', '#0BFF75', '#FFFFFF'];
  
  const end = Date.now() + duration;
  
  const frame = () => {
    (window as any).confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors
    });
    (window as any).confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors
    });
    
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  
  frame();
}

/**
 * Trigger a burst confetti effect (single burst)
 */
export function triggerConfettiBurst(options?: {
  particleCount?: number;
  spread?: number;
  colors?: string[];
}) {
  if (typeof window === 'undefined' || !(window as any).confetti) return;
  
  const particleCount = options?.particleCount || 100;
  const spread = options?.spread || 70;
  const colors = options?.colors || ['#B392F0', '#0BFF75', '#FFFFFF'];
  
  (window as any).confetti({
    particleCount,
    spread,
    origin: { y: 0.6 },
    colors
  });
}

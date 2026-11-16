/**
 * Accessibility utilities for WCAG compliance
 */

/**
 * Calculate relative luminance of a color
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color in hex format
 * @param color2 Second color in hex format
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * @param ratio Contrast ratio
 * @param level 'normal' for normal text (4.5:1), 'large' for large text (3:1)
 */
export function meetsWCAGAA(ratio: number, level: 'normal' | 'large' = 'normal'): boolean {
  return level === 'normal' ? ratio >= 4.5 : ratio >= 3;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * @param ratio Contrast ratio
 * @param level 'normal' for normal text (7:1), 'large' for large text (4.5:1)
 */
export function meetsWCAGAAA(ratio: number, level: 'normal' | 'large' = 'normal'): boolean {
  return level === 'normal' ? ratio >= 7 : ratio >= 4.5;
}

/**
 * Verify color combinations used in the application
 */
export function verifyColorContrast() {
  const colorCombinations = [
    // Background: #0D0E11, Text: #FFFFFF (white)
    { bg: '#0D0E11', fg: '#FFFFFF', description: 'Primary text on dark background' },
    // Background: #0D0E11, Text: #99A1AF (muted)
    { bg: '#0D0E11', fg: '#99A1AF', description: 'Muted text on dark background' },
    // Background: #1E1F22, Text: #FFFFFF (white)
    { bg: '#1E1F22', fg: '#FFFFFF', description: 'Text on card background' },
    // Background: #1E1F22, Text: #99A1AF (muted)
    { bg: '#1E1F22', fg: '#99A1AF', description: 'Muted text on card background' },
    // Background: #B392F0, Text: #FFFFFF (white)
    { bg: '#B392F0', fg: '#FFFFFF', description: 'Text on accent background' },
    // Background: #B392F0/20, Text: #B392F0
    { bg: '#0D0E11', fg: '#B392F0', description: 'Accent text on dark background' },
  ];

  const results = colorCombinations.map((combo) => {
    const ratio = getContrastRatio(combo.bg, combo.fg);
    return {
      ...combo,
      ratio: ratio.toFixed(2),
      meetsAA: meetsWCAGAA(ratio),
      meetsAAA: meetsWCAGAAA(ratio),
    };
  });

  return results;
}

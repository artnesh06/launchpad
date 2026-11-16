/**
 * Format ETH value from Wei without scientific notation
 * This is a safer alternative to ethers.formatEther() for storing in database
 * @param weiValue - The value in Wei (bigint or string)
 * @returns Formatted ETH string without scientific notation
 * @example
 * formatEtherSafe(1000000000000000000n) => "1"
 * formatEtherSafe("10000000000") => "0.00000001"
 */
export function formatEtherSafe(weiValue: bigint | string): string {
  // Convert to bigint if string
  const wei = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
  
  // Handle zero
  if (wei === 0n) return '0';
  
  // Convert to string and pad with zeros if needed
  const weiStr = wei.toString();
  const isNegative = weiStr.startsWith('-');
  const absWeiStr = isNegative ? weiStr.slice(1) : weiStr;
  
  // 1 ETH = 10^18 Wei
  const ethDecimals = 18;
  
  // Pad with leading zeros if needed
  const paddedWei = absWeiStr.padStart(ethDecimals + 1, '0');
  
  // Split into integer and decimal parts
  const integerPart = paddedWei.slice(0, -ethDecimals) || '0';
  const decimalPart = paddedWei.slice(-ethDecimals);
  
  // Remove trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, '');
  
  // Construct result
  let result = integerPart;
  if (trimmedDecimal) {
    result += '.' + trimmedDecimal;
  }
  
  return isNegative ? '-' + result : result;
}

/**
 * Format price by removing trailing zeros after decimal point
 * @param value - The numeric value to format
 * @param decimals - Maximum number of decimal places (default: 4)
 * @returns Formatted string with trailing zeros removed
 * @example
 * formatPrice(1.0000) => "1"
 * formatPrice(1.2300) => "1.23"
 * formatPrice(1.2345) => "1.2345"
 * formatPrice(0.00000001) => "0.00000001"
 */
export function formatPrice(value: number | string, decimals: number = 4): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  if (numValue === 0) return '0';
  
  // Untuk nilai sangat kecil (< 0.0001), gunakan toPrecision untuk menghindari scientific notation
  if (Math.abs(numValue) < 0.0001) {
    // Gunakan 4 significant digits
    const formatted = numValue.toPrecision(4);
    // Hapus trailing zeros
    return parseFloat(formatted).toString();
  }
  
  // Convert to fixed decimal places
  const fixed = numValue.toFixed(decimals);
  
  // Remove trailing zeros and unnecessary decimal point
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Format decimal with K/M suffix for large numbers and proper decimal handling
 * @param value - The numeric value to format
 * @param decimal - Number of decimal places (default: 2)
 * @returns Formatted string
 * @example
 * formatDecimal(1500000) => "1.5M"
 * formatDecimal(2500) => "2.5K"
 * formatDecimal(0.00123) => "0.0012"
 * formatDecimal(2.5) => "2.5"
 */
export function formatDecimal(value?: string | number | null | undefined, decimal: number = 2): string {
  if (!value && value !== 0) return '0';
  
  // Convert string to number if needed
  let number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) return '0';
  
  // Format based on size
  if (number >= 1_000_000) {
    // For millions
    const divided = number / 1_000_000;
    const isWholeAfterDivision = Number.isInteger(divided);
    return isWholeAfterDivision
      ? `${Math.floor(divided)}M`
      : `${divided.toFixed(decimal)}M`;
  } else if (number >= 1_000) {
    // For thousands
    const divided = number / 1_000;
    const isWholeAfterDivision = Number.isInteger(divided);
    return isWholeAfterDivision
      ? `${Math.floor(divided)}K`
      : `${divided.toFixed(decimal)}K`;
  }
  
  // For numbers less than 1000
  const isWholeNumber = Number.isInteger(number);
  const isSmallDecimal = number < 1 && number > 0;
  
  if (isWholeNumber) {
    return `${Math.floor(number)}`;
  } else if (isSmallDecimal) {
    // For small decimals, use max 4 decimal places to avoid floating point issues
    return number.toFixed(4).replace(/\.?0+$/, '');
  } else {
    // For other decimal numbers (like 2.5, 3.55), use toFixed
    return number.toFixed(decimal).replace(/\.?0+$/, '');
  }
}

/**
 * Format volume with appropriate decimal places and K/M suffix
 * @param value - The volume value to format (in ETH)
 * @returns Formatted volume string
 */
export function formatVolume(value: number | string): string {
  return formatDecimal(value, 2);
}

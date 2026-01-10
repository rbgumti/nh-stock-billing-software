/**
 * Format a number to 2 decimal places with thousand separators for display in reports
 * This ensures consistent number formatting across all reports
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format a number to 2 decimal places and return as number (for Excel exports)
 */
export const roundTo2 = (value: number): number => {
  return Number(value.toFixed(2));
};

/**
 * Format a number with thousand separators but no decimal places (for quantities)
 */
export const formatQuantity = (value: number): string => {
  return value.toLocaleString('en-IN');
};

/**
 * Format a number to max 5 decimal places for PO/GRN (removes trailing zeros)
 */
export const formatPrecision = (value: number): string => {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5
  });
};

/**
 * Round a number to 5 decimal places
 */
export const roundTo5 = (value: number): number => {
  return Number(value.toFixed(5));
};

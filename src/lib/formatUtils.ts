/**
 * Format a number to 2 decimal places for display in reports
 * This ensures consistent number formatting across all reports
 */
export const formatNumber = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Format a number to 2 decimal places and return as number (for Excel exports)
 */
export const roundTo2 = (value: number): number => {
  return Number(value.toFixed(2));
};

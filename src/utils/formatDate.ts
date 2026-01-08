/**
 * Format a date string to Indonesian locale format
 * @param dateString - The date string to format
 * @returns Formatted date string or 'N/A' if invalid
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

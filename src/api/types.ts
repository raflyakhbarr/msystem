/**
 * Generic API response interface
 * Used across all API endpoints for consistent response handling
 */
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: string;
  [key: string]: any;
}

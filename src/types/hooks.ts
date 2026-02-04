export interface UseCrudFormOptions<T extends Record<string, unknown>> {
  saveFunction: (data: T) => Promise<unknown>;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessagePrefix?: string;
  showToast?: boolean;
}

export interface UseCrudFormReturn<T extends Record<string, unknown>> {
  saving: boolean;
  handleSave: (formData: T | null, idKey?: string) => Promise<void>;
}
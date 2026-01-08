import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseCrudFormOptions {
  saveFunction: (data: any) => Promise<any>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessagePrefix?: string;
  showToast?: boolean;
}

interface UseCrudFormReturn {
  saving: boolean;
  handleSave: (formData: any | null, idKey?: string) => Promise<void>;
}

export function useCrudForm(
  options: UseCrudFormOptions
): UseCrudFormReturn {
  const [saving, setSaving] = useState(false);

  const {
    saveFunction,
    onSuccess,
    onError,
    successMessage = 'Data saved successfully!',
    errorMessagePrefix = 'Error saving data',
    showToast = true,
  } = options;

  const handleSave = useCallback(async (formData: any | null, idKey: string = 'id') => {
    if (!formData) return;

    setSaving(true);
    try {
      const isEdit = formData[idKey] !== undefined && formData[idKey] !== null;
      const result = await saveFunction(formData);

      if (showToast) {
        toast.success(isEdit ? `${successMessage} updated!` : successMessage);
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${errorMessagePrefix}: ${errorMessage}`);

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    } finally {
      setSaving(false);
    }
  }, [saveFunction, onSuccess, onError, successMessage, errorMessagePrefix]);

  return {
    saving,
    handleSave,
  };
}

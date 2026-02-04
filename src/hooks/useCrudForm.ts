import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type {UseCrudFormOptions, UseCrudFormReturn} from "@/types"


export function useCrudForm<T extends Record<string,unknown>>(
  options: UseCrudFormOptions<T>
): UseCrudFormReturn<T> {
  const [saving, setSaving] = useState(false);

  const {
    saveFunction,
    onSuccess,
    onError,
    successMessage = 'Data saved successfully!',
    errorMessagePrefix = 'Error saving data',
    showToast = true,
  } = options;

  const handleSave = useCallback(async (formData: T | null, idKey: string = 'id') => {
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
  }, [saveFunction, onSuccess, onError, successMessage, errorMessagePrefix, showToast]);

  return {
    saving,
    handleSave,
  };
}

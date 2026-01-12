import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type AccountFormData = {
  id?: number;
  nipp: string;
  email: string;
};

interface EditModalProps {
  showModal: boolean;
  formData: AccountFormData | null;
  setFormData: (data: AccountFormData | null) => void;
  setShowModal: (show: boolean) => void;
  handleSubmit: (data: AccountFormData) => void;
}

const EditModal = ({
  showModal,
  formData,
  setFormData,
  setShowModal,
  handleSubmit
}: EditModalProps) => {
  const [saving, setSaving] = useState(false);
  const isEdit = formData && formData.id;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      setSaving(true);
      try {
        await handleSubmit(formData);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save account');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!isEdit) {
      setFormData(null);
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Account' : 'Add New Account'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit}>
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <Field>
              <FieldLabel>NIPP</FieldLabel>
              <FieldContent>
                <Input
                  type="text"
                  value={formData?.nipp || ''}
                  onChange={(e) => setFormData({ ...formData!, nipp: e.target.value })}
                  placeholder="Enter NIPP"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <Input
                    type="email"
                    value={formData?.email || ''}
                    onChange={(e) => setFormData({ ...formData!, email: e.target.value })}
                    placeholder="Enter email"
                  />
              </FieldContent>
            </Field> 
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Account' : 'Save Account'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

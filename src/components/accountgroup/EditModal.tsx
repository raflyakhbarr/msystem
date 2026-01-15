import React, { useState } from 'react';
import SystemComboBox from '../ComboBox/SystemComboBox';
import MenuGroupComboBox from '../ComboBox/MenuGroupComboBox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type AccGroupFormData = {
  id?: number;
  namaGroup: string;
  codeGroup: string | number;
  idSistem: string | number | undefined;
  isAdministrator: boolean;
  status: boolean;
};

interface EditModalProps {
  showModal: boolean;
  formData: AccGroupFormData | null;
  setFormData: (data: AccGroupFormData | null) => void;
  setShowModal: (show: boolean) => void;
  handleSubmit: (data: AccGroupFormData) => void;
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
      try {
        setSaving(true);
        await handleSubmit(formData);
        toast.success(isEdit ? 'Account group updated successfully!' : 'Account group created successfully!');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save account group');
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

  const getCodeGroupValue = (): number | undefined => {
    if (formData?.codeGroup === undefined || formData?.codeGroup === null) {
      return undefined;
    }
 
    let rawValue: string | number | undefined;
 
    if (typeof formData.codeGroup === 'object') {
      if ('value' in formData.codeGroup) {
        rawValue = (formData.codeGroup as unknown as { value: number }).value;
      } else if ('id' in formData.codeGroup) {
        rawValue = (formData.codeGroup as unknown as { id: number }).id;
      }
    } else {
      rawValue = formData.codeGroup;
    }
 
    const numValue = Number(rawValue);
 
    return isNaN(numValue) ? undefined : numValue;
  };

  return (
    <Dialog open={showModal} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Account Group' : 'Add New Account Group'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit}>
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <Field>
              <FieldLabel>Group Name</FieldLabel>
              <FieldContent>
                <Input
                  value={formData?.namaGroup || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData!, namaGroup: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Endpoint Group</FieldLabel>
              <FieldContent className="overflow-visible">
                <MenuGroupComboBox
                  value={getCodeGroupValue()}
                  onValueChange={(value) => setFormData({ ...formData!, codeGroup: value })}
                  placeholder="Select endpoint group..."
                  className="w-full"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>System</FieldLabel>
              <FieldContent className="overflow-visible">
                <SystemComboBox
                  value={typeof formData?.idSistem === 'number' ? formData.idSistem : undefined}
                  onValueChange={(value) => setFormData({ ...formData!, idSistem: value })}
                  placeholder="Select system..."
                  className="w-full"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Is Administrator</FieldLabel>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData?.isAdministrator || false}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData!, isAdministrator: checked })}
                  />
                  <Label className="text-sm">
                    {formData?.isAdministrator ? 'Yes' : 'No'}
                  </Label>
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData?.status !== undefined ? formData.status : true}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData!, status: checked })}
                  />
                  <Label className="text-sm">
                    {formData?.status !== undefined ? (formData.status ? 'Active' : 'Inactive') : 'Active'}
                  </Label>
                </div>
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
                isEdit ? 'Update Account Group' : 'Save Account Group'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

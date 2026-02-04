import React, { useState } from 'react';
import MenuGroupComboBox from '../ComboBox/MenuGroupComboBox';
import type { MenuItem } from '@/types';
import {  Dialog,  DialogContent,  DialogHeader,  DialogTitle,} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditModalProps {
  showModal: boolean;
  formData: Partial<MenuItem> | null;
  setFormData: (data: Partial<MenuItem> | null) => void;
  setShowModal: (show: boolean) => void;
  handleSubmit: () => void;
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

  const handleCloseForm = () => {
    setShowModal(false);
    if (!isEdit) {
      setFormData({
        isSidebar: false,
        nama: '',
        fitur: '',
        pathMenu: '',
        group_menu: undefined,
        noMenu: undefined
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await handleSubmit();
      toast.success(isEdit ? 'Endpoint updated successfully!' : 'Endpoint created successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save endpoint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={handleCloseForm}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Endpoint' : 'Add New Menu'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit}>
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            
            <Field>
              <FieldLabel>Endpoint Group</FieldLabel>
              <FieldContent className="overflow-visible">
                <MenuGroupComboBox
                  value={
                    typeof formData?.group_menu === 'object' && formData.group_menu !== null && 'id' in formData.group_menu
                      ? (formData.group_menu as {id:number}).id
                      :typeof formData?.group_menu === 'number'
                      ? formData?.group_menu
                      :undefined
                  }
                  onValueChange={(value) => setFormData({
                    ...formData,
                    group_menu: value,
                    noMenu: value
                  })}
                  placeholder="Select menu group..."
                  className="w-full"
                />
              </FieldContent>
            </Field>
            
            
            <Field>
              <FieldLabel>Endpoint Name</FieldLabel>
              <FieldContent>
                <Input
                  value={formData?.nama || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nama: e.target.value})}
                  placeholder="Enter endpoint name"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Endpoint Path</FieldLabel>
              <FieldContent>
                <Input
                  value={formData?.pathMenu || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, pathMenu: e.target.value})}
                  placeholder="Enter endpoint path"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <FieldContent>
                <Input
                  value={formData?.fitur || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fitur: e.target.value})}
                  placeholder="Enter description"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isSidebar"
                    checked={formData?.isSidebar || false}
                    onCheckedChange={(checked: boolean) => setFormData({...formData, isSidebar: checked})}
                  />
                  <Label htmlFor="isSidebar" className="text-sm cursor-pointer">
                    Show in Sidebar
                  </Label>
                </div>
              </FieldContent>
            </Field>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseForm}
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
                isEdit ? 'Update Endpoint' : 'Save Data'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

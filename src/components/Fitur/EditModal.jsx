import React from 'react';
import SystemComboBox from '../ComboBox/SystemComboBox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"

const EditModal = ({
  showModal,
  formData,
  setFormData,
  setShowModal,
  handleSubmit
}) => {
  const isEdit = formData && formData.id;

  const handleCloseForm = () => {
    setShowModal(false);
    if (!isEdit) {
      setFormData(null);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <Dialog open={showModal} onOpenChange={handleCloseForm}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Fitur' : 'Add New Fitur'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit}>
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <Field>
              <FieldLabel>Menu</FieldLabel>
              <FieldContent>
                <Input
                  type="text"
                  value={formData?.menu || ''}
                  onChange={(e) => setFormData({...formData, menu: e.target.value})}
                  placeholder="Enter menu name"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Route</FieldLabel>
              <FieldContent>
                <Input
                  type="text"
                  value={formData?.route || ''}
                  onChange={(e) => setFormData({...formData, route: e.target.value})}
                  placeholder="Enter route"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Order</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  value={formData?.urutan || ''}
                  onChange={(e) => setFormData({...formData, urutan: e.target.value})}
                  placeholder="Enter order"
                  required
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Icon</FieldLabel>
              <FieldContent>
                <Input
                  type="text"
                  value={formData?.icon || ''}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  placeholder="Enter icon filename (e.g., icon.png)"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>System</FieldLabel>
              <FieldContent className="overflow-visible">
                <SystemComboBox
                  value={typeof formData?.idSistem === 'number' ? formData.idSistem : undefined}
                  onValueChange={(value) => setFormData({ ...formData, idSistem: value })}
                  placeholder="Select system..."
                  className="w-full"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Show Feature</FieldLabel>
              <FieldContent>
                <Input
                  type="text"
                  value={formData?.showFiture || ''}
                  onChange={(e) => setFormData({...formData, showFiture: e.target.value})}
                  placeholder="Enter show feature value"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="status"
                    checked={formData?.status !== false}
                    onCheckedChange={(checked) => setFormData({...formData, status: checked})}
                  />
                  <Label htmlFor="status" className="text-sm cursor-pointer">
                    Active Status
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
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? 'Update Fitur' : 'Save Fitur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

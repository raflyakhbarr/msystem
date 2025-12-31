import React from 'react';
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
import SystemComboBox from '../ComboBox/SystemComboBox';

const EditModal = ({ editingMenuGroup, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState({
    nama: editingMenuGroup?.nama || '',
    idSistem: editingMenuGroup?.idSistem || '',
    status: editingMenuGroup?.status !== undefined ? editingMenuGroup.status : true,
    isAdministrator: editingMenuGroup?.isAdministrator || false
  });

  // Update form data when editingMenuGroup changes
  React.useEffect(() => {
    setFormData({
      nama: editingMenuGroup?.nama || '',
      idSistem: editingMenuGroup?.idSistem || '',
      status: editingMenuGroup?.status !== undefined ? editingMenuGroup.status : true,
      isAdministrator: editingMenuGroup?.isAdministrator || false
    });
  }, [editingMenuGroup]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      ...(editingMenuGroup?.id && { id: editingMenuGroup.id }),
      ...formData
    };

    onSave(dataToSave);
  };

  const handleCloseForm = () => {
    if (!editingMenuGroup?.id) {
      // Reset form data only for add mode
      setFormData({
        nama: '',
        idSistem: '',
        status: true,
        isAdministrator: false
      });
    }
    onCancel();
  };

  return (
    <Dialog open={!!editingMenuGroup} onOpenChange={handleCloseForm}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editingMenuGroup?.id ? 'Edit Menu Group' : 'Add New Menu Group'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <Field>
              <FieldLabel>Menu Name</FieldLabel>
              <FieldContent>
                <Input
                  value={formData.nama}
                  onChange={(e) => handleChange('nama', e.target.value)}
                  placeholder="Enter menu name"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>System</FieldLabel>
              <FieldContent className="overflow-visible">
                <SystemComboBox
                  value={formData.idSistem || undefined}
                  onValueChange={(value) => handleChange('idSistem', value)}
                  placeholder="Select system..."
                  className="w-full"
                />
              </FieldContent>
            </Field>
            
            <Field>
              <FieldLabel>Status</FieldLabel>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.status}
                    onCheckedChange={(checked) => handleChange('status', checked)}
                  />
                  <Label className="text-sm">
                    {formData.status ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Is Administrator</FieldLabel>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isAdministrator}
                    onCheckedChange={(checked) => handleChange('isAdministrator', checked)}
                  />
                  <Label className="text-sm">
                    {formData.isAdministrator ? 'Yes' : 'No'}
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
              {editingMenuGroup?.id ? 'Update Menu Group' : 'Save Menu Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

import React from 'react';
import MenuGroupComboBox from '../ComboBox/MenuGroupComboBox';
import type { MenuItem } from '../../api/menuApi';

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
  if (!showModal || !formData) {
    return null;
  }

  // Determine if this is an edit operation based on whether formData has an id
  const isEdit = formData && formData.id;

  const handleCloseForm = () => {
    setShowModal(false);
    if (!isEdit) {
      // Reset form data only for add mode
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">
            {isEdit ? 'Edit Endpoint' : 'Add New Menu'}
          </h3>
          <button className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none" onClick={handleCloseForm}>×</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            {/* Input Nama */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Endpoint Name</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.nama || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nama: e.target.value})}
                required
              />
            </div>

            {/* Input Fitur */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.fitur || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fitur: e.target.value})}
                required
              />
            </div>

            {/* Input Path */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Endpoint Path</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.pathMenu || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, pathMenu: e.target.value})}
                required
              />
            </div>

            {/* Menu Group ComboBox */}
            <div className="relative z-[10001]">
              <label className="block text-sm font-medium text-foreground mb-1">Endpoint Group</label>
              <MenuGroupComboBox
                value={
                  typeof formData.group_menu === 'object' && formData.group_menu !== null && 'id' in formData.group_menu
                    ? (formData.group_menu as any).id
                    : formData.group_menu
                }
                onValueChange={(value) => setFormData({
                  ...formData,
                  group_menu: value,
                  noMenu: value
                })}
                placeholder="Select menu group..."
                className="w-full"
              />
            </div>

            {/* Checkbox Sidebar */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="isSidebar"
                type="checkbox"
                className="h-5 w-5 text-primary border-input bg-background rounded focus:ring-ring"
                checked={formData.isSidebar || false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, isSidebar: e.target.checked})}
              />
              <label htmlFor="isSidebar" className="text-sm font-medium text-foreground select-none">
                Show in Sidebar (True/False)
              </label>
            </div>

            {isEdit ? (
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-md transition-colors"
                  onClick={handleCloseForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md transition-colors"
                  onClick={handleSubmit}
                >
                  Update Endpoint
                </button>
              </div>
            ) : (
              <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded w-full transition-colors">
                Save Data
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
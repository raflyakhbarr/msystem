import React from 'react';
import SystemComboBox from '../ComboBox/SystemComboBox';
import MenuGroupComboBox from '../ComboBox/MenuGroupComboBox';
import type { SystemItem } from '@/api/SystemApi';

export type AccGroupFormData = {
  id?: number;
  namaGroup: string;
  codeGroup: string | number;
  idSistem: string | number;
  isAdministrator: boolean;
  status: boolean;
};

interface EditModalProps {
  showModal: boolean;
  formData: AccGroupFormData | null;
  systems: SystemItem[];
  setFormData: (data: AccGroupFormData | null) => void;
  setShowModal: (show: boolean) => void;
  handleSubmit: (data: AccGroupFormData) => void;
}

const EditModal = ({
  showModal,
  formData,
  systems,
  setFormData,
  setShowModal,
  handleSubmit
}: EditModalProps) => {
  const isEdit = formData && formData.id;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      handleSubmit(formData);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!isEdit) {
      setFormData(null);
    }
  };

  if (!showModal || !formData) {
    return null;
  }

  // Helper to extract codeGroup value if it's an object
  const getCodeGroupValue = (): number | undefined => {
    if (typeof formData.codeGroup === 'object' && formData.codeGroup !== null && 'id' in formData.codeGroup) {
      return (formData.codeGroup as { id: number }).id;
    }
    if (typeof formData.codeGroup === 'number') {
      return formData.codeGroup;
    }
    if (typeof formData.codeGroup === 'string') {
      return Number(formData.codeGroup);
    }
    return undefined;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleCloseModal}></div>

      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">
            {isEdit ? 'Edit Account Group' : 'Add New Account Group'}
          </h3>
          <button
            className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Group Name</label>
              <input
                type="text"
                required
                value={formData.namaGroup || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, namaGroup: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Endpoint Group</label>
              <MenuGroupComboBox
                value={getCodeGroupValue()}
                onValueChange={(value) => setFormData({ ...formData, codeGroup: value })}
                placeholder="Select endpoint group..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">System</label>
              <SystemComboBox
                value={typeof formData.idSistem === 'number' ? formData.idSistem : undefined}
                onValueChange={(value) => setFormData({ ...formData, idSistem: value })}
                placeholder="Select system..."
                className="w-full"
              />
            </div>

            {/* Is Administrator Toggle */}
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isAdministrator || false}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isAdministrator: e.target.checked })}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-primary-foreground after:border-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-foreground">Is Administrator</span>
              </label>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.status !== undefined ? formData.status : true}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, status: e.target.checked })}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-primary-foreground after:border-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-foreground">
                  {formData.status !== undefined ? (formData.status ? 'Status Active' : 'Status Inactive') : 'Status Active'}
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t border-border">
            <button
              type="button"
              className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-md transition-colors"
              onClick={handleCloseModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md transition-colors"
            >
              {isEdit ? 'Update Account Group' : 'Save Account Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
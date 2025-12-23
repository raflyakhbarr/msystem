import React from 'react';
import type { AccountItem } from '@/api/accountApi';

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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleCloseModal}></div>

      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">
            {isEdit ? 'Edit Account' : 'Add New Account'}
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
              <label className="block text-sm font-medium text-foreground mb-1">NIPP</label>
              <input
                type="text"
                required
                value={formData.nipp || ''}
                onChange={(e) => setFormData({ ...formData, nipp: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t border-border bg-muted/50">
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
              {isEdit ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
import React from 'react';
import SystemComboBox from '../ComboBox/SystemComboBox';

const EditModal = ({
  showModal,
  formData,
  setFormData,
  setShowModal,
  handleSubmit
}) => {
  if (!showModal) {
    return null;
  }

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
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">
            {isEdit ? 'Edit Fitur' : 'Add New Fitur'}
          </h3>
          <button className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none" onClick={handleCloseForm}>×</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleFormSubmit} className="space-y-4">
             
            {/* Input Menu */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Menu</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.menu || ''}
                onChange={(e) => setFormData({...formData, menu: e.target.value})}
                required
              />
            </div>

            {/* Input Route */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Route</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.route || ''}
                onChange={(e) => setFormData({...formData, route: e.target.value})}
                required
              />
            </div>

            {/* Input Urutan */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Order</label>
              <input
                type="number"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.urutan || ''}
                onChange={(e) => setFormData({...formData, urutan: e.target.value})}
                required
              />
            </div>

            {/* Input Icon */}
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Icon</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.icon || ''}
                onChange={(e) => setFormData({...formData, icon: e.target.value})}
                placeholder="Enter icon filename (e.g., icon.png)"
              />
            </div>

            {/* System ComboBox */}
            <div className="relative z-[10001]">
              <label className="block text-sm font-medium text-foreground mb-1">System</label>
              <SystemComboBox
                value={typeof formData.idSistem === 'number' ? formData.idSistem : undefined}
                onValueChange={(value) => setFormData({ ...formData, idSistem: value })}
                placeholder="Select system..."
                className="w-full"
              />
            </div>

            {/* Input Show Feature */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Show Feature</label>
              <input
                type="text"
                className="w-full border border-input bg-background p-2 rounded focus:ring-2 focus:ring-ring focus:outline-none"
                value={formData.showFiture || ''}
                onChange={(e) => setFormData({...formData, showFiture: e.target.value})}
                placeholder="Enter show feature value"
              />
            </div>

            {/* Checkbox Status */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="status"
                type="checkbox"
                className="h-5 w-5 text-primary border-input bg-background rounded focus:ring-2 focus:ring-ring"
                checked={formData.status !== false} // Default to true unless explicitly false
                onChange={(e) => setFormData({...formData, status: e.target.checked})}
              />
              <label htmlFor="status" className="text-sm font-medium text-foreground select-none">
                Active Status
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
                  Update Fitur
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
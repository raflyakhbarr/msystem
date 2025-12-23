import React from 'react';

const EditModal = ({ editingSystem, onSave, onCancel }) => {
  if (!editingSystem) {
    return null;
  }

  const [formData, setFormData] = React.useState({
    nama: editingSystem?.nama || '',
    url: editingSystem?.url || '',
    destination: editingSystem?.destination || '',
    typeApi: editingSystem?.typeApi || 'not_token',
    status: editingSystem?.status !== undefined ? editingSystem.status : true,
    headers: editingSystem?.headers || '{"Accept":"application/json"}',
    token: editingSystem?.token || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSave = {
      ...(editingSystem?.id && { id: editingSystem.id }),
      ...formData
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">
            {editingSystem?.id ? 'Edit System Configuration' : 'Add New System Configuration'}
          </h3>
          <button
            className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className="block text-sm font-medium text-foreground">Nama</label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => handleChange('nama', e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">URL</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Destination</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => handleChange('destination', e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Type API</label>
            <select
              value={formData.typeApi}
              onChange={(e) => handleChange('typeApi', e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="not_token">Not Token</option>
              <option value="token">Token</option>
              <option value="basic">Basic Auth</option>
              <option value="oauth">OAuth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: !prev.status }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  formData.status ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-primary-foreground transition-transform ${
                    formData.status ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-3 text-sm text-foreground">
                {formData.status ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Headers (JSON)</label>
            <textarea
              value={formData.headers}
              onChange={(e) => handleChange('headers', e.target.value)}
              rows="3"
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder='{"Accept": "application/json"}'
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Token</label>
            <input
              type="text"
              value={formData.token}
              onChange={(e) => handleChange('token', e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Leave empty if not required"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 p-6 border-t border-border bg-muted/50">
          <button
            className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-md transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md transition-colors"
            onClick={handleSubmit}
          >
            {editingSystem?.id ? 'Update Configuration' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
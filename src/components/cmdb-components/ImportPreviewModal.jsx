// msystem/src/components/cmdb-components/ImportPreviewModal.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Plus, RefreshCcw, XCircle, Database, FolderOpen } from 'lucide-react';
import api from '../../services/api';

export default function ImportPreviewModal({ show, onClose, workspaceId, previewId, onConfirm }) {
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [blockingErrors, setBlockingErrors] = useState(null);

  React.useEffect(() => {
    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`/cmdb/import/preview?preview_id=${previewId}`);
        setPreview(response.data);

        // Check for blocking errors from backend
        if (response.data.error) {
          setBlockingErrors(response.data.error);
        }
      } catch (err) {
        console.error('Failed to fetch preview:', err);
        const errorMsg = err.response?.data?.error || err.message;
        // Check if this is a blocking error (ID conflict)
        if (errorMsg.includes('ID conflicts detected')) {
          setBlockingErrors(errorMsg);
        } else {
          setError('Gagal memuat preview. Silakan coba lagi.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (show && previewId) {
      fetchPreview();
    }
  }, [show, previewId]);

  const handleExecuteImport = async () => {
    try {
      setIsExecuting(true);

      const response = await api.post('/cmdb/import/confirm', {
        workspace_id: workspaceId,
        preview_id: previewId,
      });

      if (response.data.success) {
        onConfirm(response.data);
        onClose();
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import gagal: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={show} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading preview...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!preview) return null;

  const { conflicts, summary, itemsDetail, groupsDetail } = preview;

  // Calculate counts for badges
  const allCount = (summary.new || 0) + (summary.update || 0) + (summary.skip || 0);
  const conflictsCount = conflicts?.length || 0;

  const tabs = [
    { id: 'all', label: 'Semua', icon: Database, count: allCount, color: 'bg-primary' },
    { id: 'new', label: 'Baru', icon: Plus, count: summary.new || 0, color: 'bg-primary' },
    { id: 'update', label: 'Update', icon: RefreshCcw, count: summary.update || 0, color: 'bg-primary' },
    { id: 'skip', label: 'Skip', icon: XCircle, count: summary.skip || 0, color: 'bg-primary' },
    { id: 'conflicts', label: 'Conflict', icon: AlertTriangle, count: conflictsCount, color: 'bg-primary' },
  ];

  // Render items based on active tab
  const renderContent = () => {
    if (activeTab === 'conflicts') {
      return (
        <div className="space-y-2">
          {conflicts && conflicts.length > 0 ? (
            conflicts.map((conflict, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">{conflict.type}: {conflict.name}</p>
                <p className="text-xs text-red-600">
                  Existing: {conflict.existing} → {conflict.imported}
                </p>
              </div>
            ))
          ) : (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <Check className="inline mr-2" size={14} />
                Tidak ada conflict! Import siap dilakukan.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Render items for new/update/skip tabs
    const renderCategoryItems = (category) => {
      const items = itemsDetail?.[category] || [];
      const groups = groupsDetail?.[category] || [];

      if (items.length === 0 && groups.length === 0) {
        return (
          <div className="p-6 text-center text-muted-foreground">
            <p>Tidak ada data untuk kategori ini</p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {/* CMDB Items */}
          {items.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Database size={16} />
                CMDB Items ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name || <span className="text-muted-foreground">Unnamed</span>}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {item.id || 'Auto'} • Type: {item.type || '-'}
                        </p>
                        {item.reason && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {item.reason}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups */}
          {groups.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FolderOpen size={16} />
                Groups ({groups.length})
              </h4>
              <div className="space-y-2">
                {groups.map((group, idx) => (
                  <div key={idx} className="p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{group.name || <span className="text-muted-foreground">Unnamed</span>}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {group.id || 'Auto'} • {group.description || '-'}
                        </p>
                        {group.reason && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {group.reason}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    if (activeTab === 'all') {
      return (
        <div className="space-y-4">
          {(summary.new || 0) > 0 && (
            <div className="p-3 bg-white border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2"><Plus className="inline-block" size={16}/> Item Baru ({summary.new})</h4>
              <p className="text-xs text-green-600">Item baru akan ditambahkan ke database</p>
            </div>
          )}
          {(summary.update || 0) > 0 && (
            <div className="p-3 bg-white border border-orange-200 rounded-lg">
              <h4 className="text-sm font-medium text-orange-800 mb-2"><RefreshCcw className="inline-block" size={16}/> Item Update ({summary.update})</h4>
              <p className="text-xs text-orange-600">Item yang sudah ada akan di-update berdasarkan strategy</p>
            </div>
          )}
          {(summary.skip || 0) > 0 && (
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-2"><XCircle className="inline-block" size={16}/> Item Skip ({summary.skip})</h4>
              <p className="text-xs text-gray-600">Item ini akan dilewati (tidak di-import)</p>
            </div>
          )}
          {conflictsCount > 0 && (
            <div className="p-3 bg-white border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2"><AlertTriangle className="inline-block" size={16}/> Conflict ({conflictsCount})</h4>
              <p className="text-xs text-red-600">Ada conflict yang perlu diperhatikan</p>
            </div>
          )}
        </div>
      );
    }

    return renderCategoryItems(activeTab);
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Import</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Blocking Errors */}
          {blockingErrors && (
            <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">
                <AlertTriangle className="inline mr-2" size={16} />
                Import Tidak Dapat Dilanjutkan:
              </p>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{blockingErrors}</p>
            </div>
          )}

          {/* Regular Errors */}
          {error && !blockingErrors && (
            <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="px-4 pb-2">
            <div className="flex gap-2 border-b">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 border-b-2 transition-colors
                      ${isActive ? 'border-primary' : 'border-transparent hover:border-gray-300'}
                    `}
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium">{tab.label}</span>
                    <Badge className={`${tab.color} text-white`} variant="secondary">
                      {tab.count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {renderContent()}
          </div>
        </div>

        <DialogFooter className="border-t">
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Batal
          </Button>
          <Button onClick={handleExecuteImport} disabled={isExecuting || blockingErrors}>
            {isExecuting ? 'Mengimport...' : 'Konfirmasi Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

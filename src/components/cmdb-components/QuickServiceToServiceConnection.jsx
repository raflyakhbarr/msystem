import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONNECTION_TYPES, getConnectionTypeInfo } from '../../utils/cmdb-utils/flowHelpers';
import api from '@/services/api';
import { ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * QuickServiceToServiceConnection - Modal untuk membuat koneksi antar service
 *
 * Props:
 * - open: Boolean untuk mengontrol visibility modal
 * - onClose: Callback ketika modal ditutup
 * - onConnect: Callback untuk membuat koneksi (sourceServiceId, targetServiceId, connectionType, options)
 * - sourceService: Source service object
 * - targetService: Target service object
 * - existingConnection: Existing connection object (jika edit mode)
 * - workspaceId: Workspace ID untuk fetching service items
 */
export default function QuickServiceToServiceConnection({
  open,
  onClose,
  onConnect,
  sourceService,
  targetService,
  existingConnection = null,
  workspaceId = null
}) {
  const [connectionType, setConnectionType] = useState(existingConnection?.connection_type || 'connects_to');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Service item selection states
  const [connectionTargetType, setConnectionTargetType] = useState('service'); // 'service' or 'service_item'
  const [sourceServiceItems, setSourceServiceItems] = useState([]);
  const [targetServiceItems, setTargetServiceItems] = useState([]);
  const [selectedSourceServiceItem, setSelectedSourceServiceItem] = useState(null);
  const [selectedTargetServiceItem, setSelectedTargetServiceItem] = useState(null);
  const [propagationEnabled, setPropagationEnabled] = useState(true);
  const [loadingServiceItems, setLoadingServiceItems] = useState(false);
  const [expandedServices, setExpandedServices] = useState(new Set());

  useEffect(() => {
    if (open) {
      setConnectionType(existingConnection?.connection_type || 'connects_to');
      setConnectionTargetType('service');
      setSelectedSourceServiceItem(null);
      setSelectedTargetServiceItem(null);
      setPropagationEnabled(true);
      fetchServiceItems();
    }
  }, [open, existingConnection, sourceService, targetService]);

  // Fetch service items for both source and target services
  const fetchServiceItems = async () => {
    if (!sourceService || !targetService || !workspaceId) return;

    setLoadingServiceItems(true);
    try {
      // Fetch source service items
      const sourceResponse = await api.get(`/service-items/${sourceService.id}/items`, {
        params: { workspace_id: workspaceId }
      });
      setSourceServiceItems(sourceResponse.data || []);

      // Fetch target service items
      const targetResponse = await api.get(`/service-items/${targetService.id}/items`, {
        params: { workspace_id: workspaceId }
      });
      setTargetServiceItems(targetResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch service items:', error);
    } finally {
      setLoadingServiceItems(false);
    }
  };

  // Toggle service expansion in tree view
  const toggleServiceExpansion = (serviceId) => {
    setExpandedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!sourceService || !targetService) return;

    // Validation based on connection target type
    if (connectionTargetType === 'service_item') {
      if (!selectedSourceServiceItem || !selectedTargetServiceItem) {
        alert('Silakan pilih service item untuk source dan target.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Prepare connection options
      const options = {
        connectionTargetType,
        propagationEnabled,
      };

      // Add service item IDs if connecting to service items
      if (connectionTargetType === 'service_item') {
        options.sourceServiceItemId = selectedSourceServiceItem.id;
        options.targetServiceItemId = selectedTargetServiceItem.id;
      }

      await onConnect(
        sourceService.id,
        targetService.id,
        connectionType,
        options
      );
      onClose();
    } catch (error) {
      console.error('Failed to create service-to-service connection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConnectionTypeLabel = (typeSlug) => {
    return CONNECTION_TYPES[typeSlug]?.label || typeSlug;
  };

  const getConnectionTypeDescription = (typeSlug) => {
    return CONNECTION_TYPES[typeSlug]?.short_desc || '';
  };

  const handleSelectServiceItem = (service, serviceItem, isSource) => {
    if (isSource) {
      setSelectedSourceServiceItem(serviceItem);
    } else {
      setSelectedTargetServiceItem(serviceItem);
    }
  };

  const getServiceItemIcon = (type) => {
    return <Briefcase size={16} className="text-blue-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {existingConnection ? 'Edit Koneksi Service' : 'Koneksi Service-to-Service'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {/* Source Service Info */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Source Service</Label>
              <div className="p-3 bg-muted rounded-lg border">
                <p className="font-medium">{sourceService?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: <span className={`font-medium ${
                    sourceService?.status === 'active' ? 'text-green-600' :
                    sourceService?.status === 'inactive' ? 'text-red-600' :
                    sourceService?.status === 'maintenance' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {sourceService?.status || 'Unknown'}
                  </span>
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-2xl text-muted-foreground">↓</div>
            </div>

            {/* Target Service Info */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Target Service</Label>
              <div className="p-3 bg-muted rounded-lg border">
                <p className="font-medium">{targetService?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: <span className={`font-medium ${
                    targetService?.status === 'active' ? 'text-green-600' :
                    targetService?.status === 'inactive' ? 'text-red-600' :
                    targetService?.status === 'maintenance' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {targetService?.status || 'Unknown'}
                  </span>
                </p>
              </div>
            </div>

            {/* Connection Target Type Selection */}
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Label className="text-sm font-semibold">Tipe Koneksi</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="connectionTargetType"
                    value="service"
                    checked={connectionTargetType === 'service'}
                    onChange={(e) => setConnectionTargetType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Service Level</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="connectionTargetType"
                    value="service_item"
                    checked={connectionTargetType === 'service_item'}
                    onChange={(e) => setConnectionTargetType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Service Item Level</span>
                </label>
              </div>
            </div>

            {/* Service Item Selection (Conditional) */}
            {connectionTargetType === 'service_item' && (
              <>
                {/* Source Service Item Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Source Service Item</Label>
                  <div className="p-3 bg-muted rounded-lg border max-h-48 overflow-y-auto">
                    {loadingServiceItems ? (
                      <p className="text-sm text-muted-foreground">Loading service items...</p>
                    ) : sourceServiceItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada service items</p>
                    ) : (
                      <div className="space-y-1">
                        {sourceServiceItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded cursor-pointer border transition-colors ${
                              selectedSourceServiceItem?.id === item.id
                                ? 'bg-blue-100 dark:bg-blue-900 border-blue-500'
                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => handleSelectServiceItem(sourceService, item, true)}
                          >
                            <div className="flex items-center gap-2">
                              {getServiceItemIcon(item.type)}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.type}</p>
                              </div>
                              {selectedSourceServiceItem?.id === item.id && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Service Item Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Target Service Item</Label>
                  <div className="p-3 bg-muted rounded-lg border max-h-48 overflow-y-auto">
                    {loadingServiceItems ? (
                      <p className="text-sm text-muted-foreground">Loading service items...</p>
                    ) : targetServiceItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada service items</p>
                    ) : (
                      <div className="space-y-1">
                        {targetServiceItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded cursor-pointer border transition-colors ${
                              selectedTargetServiceItem?.id === item.id
                                ? 'bg-blue-100 dark:bg-blue-900 border-blue-500'
                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => handleSelectServiceItem(targetService, item, false)}
                          >
                            <div className="flex items-center gap-2">
                              {getServiceItemIcon(item.type)}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.type}</p>
                              </div>
                              {selectedTargetServiceItem?.id === item.id && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Connection Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="connection-type">Tipe Koneksi</Label>
              <Select
                value={connectionType}
                onValueChange={setConnectionType}
              >
                <SelectTrigger id="connection-type">
                  <SelectValue placeholder="Pilih tipe koneksi" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONNECTION_TYPES).map(([slug, config]) => (
                    <SelectItem key={slug} value={slug}>
                      <div className="flex flex-col">
                        <span className="font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {config.short_desc}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connectionType && (
                <p className="text-xs text-muted-foreground">
                  {getConnectionTypeDescription(connectionType)}
                </p>
              )}
            </div>

            {/* Status Propagation Toggle */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <input
                type="checkbox"
                id="service-propagation"
                checked={propagationEnabled}
                onChange={(e) => setPropagationEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="service-propagation" className="text-sm font-medium cursor-pointer">
                Enable Status Propagation
              </label>
            </div>

            {/* Connection Type Info Box */}
            {connectionType && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-semibold">Arah Propagasi:</span>
                </p>
                <p className="text-xs">
                  {propagationEnabled ? (
                    <>
                      {getConnectionTypeInfo(connectionType).propagation === 'target_to_source' && (
                        <span>Target → Source: Jika target bermasalah, source terpengaruh</span>
                      )}
                      {getConnectionTypeInfo(connectionType).propagation === 'source_to_target' && (
                        <span>Source → Target: Jika source bermasalah, target terpengaruh</span>
                      )}
                      {getConnectionTypeInfo(connectionType).propagation === 'both' && (
                        <span>Bidirectional: Keduanya saling mempengaruhi</span>
                      )}
                    </>
                  ) : (
                    <span className="text-red-600">Propagasi dinonaktifkan</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !connectionType || (connectionTargetType === 'service_item' && (!selectedSourceServiceItem || !selectedTargetServiceItem))}
          >
            {isSubmitting ? 'Menyimpan...' : existingConnection ? 'Update' : 'Buat Koneksi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

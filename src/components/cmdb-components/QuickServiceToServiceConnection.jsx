import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CONNECTION_TYPES, getConnectionTypeInfo } from '../../utils/cmdb-utils/flowHelpers';
import api from '@/services/api';
import { ChevronDown, ChevronRight, Briefcase, Search, Package, ArrowRight } from 'lucide-react';
import {
  ConnectionTypeSelector,
  ConnectionTypeWithDescription,
} from './ConnectionComponents';

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
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [targetSearchQuery, setTargetSearchQuery] = useState('');

  // Filtered service items based on search
  const filteredSourceServiceItems = useMemo(() => {
    if (!sourceSearchQuery) return sourceServiceItems;
    const query = sourceSearchQuery.toLowerCase();
    return sourceServiceItems.filter(item =>
      item.name?.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query)
    );
  }, [sourceServiceItems, sourceSearchQuery]);

  const filteredTargetServiceItems = useMemo(() => {
    if (!targetSearchQuery) return targetServiceItems;
    const query = targetSearchQuery.toLowerCase();
    return targetServiceItems.filter(item =>
      item.name?.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query)
    );
  }, [targetServiceItems, targetSearchQuery]);

  useEffect(() => {
    if (open) {
      setConnectionType(existingConnection?.connection_type || 'connects_to');
      setConnectionTargetType('service');
      setSelectedSourceServiceItem(null);
      setSelectedTargetServiceItem(null);
      setPropagationEnabled(true);
      setSourceSearchQuery('');
      setTargetSearchQuery('');
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>
            {existingConnection ? 'Edit Koneksi Service' : 'Koneksi Service-to-Service'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 py-4">
            {/* Visual Connection Preview */}
            <div className="bg-muted rounded-lg p-6">
              <div className="text-center text-sm text-muted-foreground mb-4 font-medium">
                VISUALISASI KONEKSI
              </div>

              <div className="flex items-center justify-center gap-4">
                {/* Source Service */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center border-2 bg-blue-100 border-blue-300">
                    <Package size={32} className="text-blue-600" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{sourceService?.name || 'Source'}</div>
                    <div className="text-xs text-muted-foreground">Service</div>
                  </div>
                </div>

                {/* Connection Arrow */}
                <div className="flex flex-col items-center gap-2 px-4">
                  <div className="rounded-full p-2 bg-background border-2 shadow-md">
                    <ArrowRight size={28} style={{ color: getConnectionTypeInfo(connectionType).color }} />
                  </div>
                  <div
                    className="text-xs font-semibold px-2 py-1 rounded text-white"
                    style={{ backgroundColor: getConnectionTypeInfo(connectionType).color }}
                  >
                    {getConnectionTypeInfo(connectionType).label}
                  </div>
                </div>

                {/* Target Service */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center border-2 bg-purple-100 border-purple-300">
                    <Package size={32} className="text-purple-600" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{targetService?.name || 'Target'}</div>
                    <div className="text-xs text-muted-foreground">Service</div>
                  </div>
                </div>
              </div>

              {/* Description based on propagation rule */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {getConnectionTypeInfo(connectionType).propagation === 'target_to_source' && (
                  <span>
                    <strong>{sourceService?.name}</strong> {getConnectionTypeInfo(connectionType).label.toLowerCase()} <strong>{targetService?.name}</strong>
                  </span>
                )}
                {getConnectionTypeInfo(connectionType).propagation === 'source_to_target' && (
                  <span>
                    <strong>{sourceService?.name}</strong> {getConnectionTypeInfo(connectionType).label.toLowerCase()} <strong>{targetService?.name}</strong>
                  </span>
                )}
                {getConnectionTypeInfo(connectionType).propagation === 'both' && (
                  <span>
                    <strong>{sourceService?.name}</strong> dan <strong>{targetService?.name}</strong> memiliki hubungan {getConnectionTypeInfo(connectionType).label.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Connection Target Type Selection - Using Tabs */}
            <div className="space-y-2">
              <Tabs value={connectionTargetType} onValueChange={setConnectionTargetType} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="service">Service Level</TabsTrigger>
                  <TabsTrigger value="service_item">Service Item Level</TabsTrigger>
                </TabsList>

                {/* Service Level Tab Content */}
                <TabsContent value="service" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Koneksi akan dibuat langsung antar service. Status propagasi akan diterapkan pada level service.
                  </p>
                </TabsContent>

                {/* Service Item Level Tab Content */}
                <TabsContent value="service_item" className="mt-4 space-y-4">
                  {/* Source Service Item Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Source Service Item</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Cari service item..."
                        value={sourceSearchQuery}
                        onChange={(e) => setSourceSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-lg border max-h-48 overflow-y-auto">
                      {loadingServiceItems ? (
                        <p className="text-sm text-muted-foreground">Loading service items...</p>
                      ) : filteredSourceServiceItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {sourceSearchQuery ? 'Tidak ada hasil pencarian' : 'Tidak ada service items'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredSourceServiceItems.map((item) => (
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
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Cari service item..."
                        value={targetSearchQuery}
                        onChange={(e) => setTargetSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-lg border max-h-48 overflow-y-auto">
                      {loadingServiceItems ? (
                        <p className="text-sm text-muted-foreground">Loading service items...</p>
                      ) : filteredTargetServiceItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {targetSearchQuery ? 'Tidak ada hasil pencarian' : 'Tidak ada service items'}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredTargetServiceItems.map((item) => (
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
                </TabsContent>
              </Tabs>
            </div>

            {/* Connection Type Selection with Description */}
            <ConnectionTypeWithDescription
              selectedType={connectionType}
              CONNECTION_TYPES={CONNECTION_TYPES}
              onTypeChange={setConnectionType}
              label="Pilih Tipe Koneksi"
            />

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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 px-6 pb-6 border-t">
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

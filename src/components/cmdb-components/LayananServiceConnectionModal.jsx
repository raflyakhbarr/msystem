import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import api from '../../services/api';

/**
 * LayananServiceConnectionModal - Dedicated modal for creating layana ↔ service connections
 *
 * Features:
 * - Simple cascading dropdowns (not hierarchical tree)
 * - Connection type selector with propagation info
 * - Bidirectional support (layana→service OR service→layana)
 * - Existing connection detection
 * - Propagation toggle
 */
export default function LayananServiceConnectionModal({
  open,
  onClose,
  onConnect,
  sourceNode,
  workspaceId,
}) {
  // Form state
  const [connectionType, setConnectionType] = useState('connects_to');
  const [propagationEnabled, setPropagationEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [cmdbItems, setCmdbItems] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [existingConnections, setExistingConnections] = useState([]);

  // Selection state
  const [selectedCmdbItem, setSelectedCmdbItem] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceItem, setSelectedServiceItem] = useState(null);

  // Loading states
  const [loadingCmdbItems, setLoadingCmdbItems] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingServiceItems, setLoadingServiceItems] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Determine direction based on sourceNode type
  const isSourceLayanan = sourceNode?.type === 'layanan';
  const direction = isSourceLayanan ? 'layana-to-service' : 'service-to-layana';

  // Fetch CMDB items when modal opens
  useEffect(() => {
    if (open && workspaceId) {
      fetchCmdbItems();
      fetchExistingConnections();
    }
  }, [open, workspaceId]);

  // Fetch services when CMDB item is selected
  useEffect(() => {
    if (selectedCmdbItem) {
      fetchServices(selectedCmdbItem);
    } else {
      setServices([]);
      setServiceItems([]);
      setSelectedService(null);
      setSelectedServiceItem(null);
    }
  }, [selectedCmdbItem]);

  // Fetch service items when service is selected
  useEffect(() => {
    if (selectedService) {
      fetchServiceItems(selectedService);
    } else {
      setServiceItems([]);
      setSelectedServiceItem(null);
    }
  }, [selectedService]);

  const fetchCmdbItems = async () => {
    setLoadingCmdbItems(true);
    try {
      const response = await api.get(`/cmdb?workspace_id=${workspaceId}`);
      setCmdbItems(response.data || []);
    } catch (error) {
      console.error('Failed to fetch CMDB items:', error);
    } finally {
      setLoadingCmdbItems(false);
    }
  };

  const fetchServices = async (cmdbItem) => {
    setLoadingServices(true);
    try {
      const response = await api.get(`/services/${cmdbItem.id}`);
      setServices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchServiceItems = async (service) => {
    setLoadingServiceItems(true);
    try {
      const response = await api.get(`/service-items/${service.id}/items?workspace_id=${workspaceId}`);
      setServiceItems(response.data || []);
    } catch (error) {
      console.error('Failed to fetch service items:', error);
      setServiceItems([]);
    } finally {
      setLoadingServiceItems(false);
    }
  };

  const fetchExistingConnections = async () => {
    setLoadingExisting(true);
    try {
      const response = await api.get(`/layanan/connections?workspace_id=${workspaceId}`);
      setExistingConnections(response.data || []);
    } catch (error) {
      console.error('Failed to fetch existing connections:', error);
      setExistingConnections([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  const checkIfConnectionExists = (targetId, targetType) => {
    if (!sourceNode) return false;

    const layanaId = sourceNode.data.id;

    return existingConnections.some(conn => {
      if (isSourceLayanan) {
        // Layana → Service
        return (
          conn.source_type === 'layanan' &&
          conn.source_id === layanaId &&
          conn.target_type === targetType &&
          conn.target_id === targetId
        );
      } else {
        // Service → Layana
        return (
          conn.source_type === targetType &&
          conn.source_id === targetId &&
          conn.target_type === 'layanan' &&
          conn.target_id === layanaId
        );
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedCmdbItem || !selectedService) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine target based on direction
      const targetType = 'service';
      const targetId = selectedService.id;
      const layanaId = sourceNode.data.id;

      const connectionData = {
        source_type: isSourceLayanan ? 'layanan' : 'service',
        source_id: isSourceLayanan ? layanaId : selectedService.id,
        target_type: isSourceLayanan ? 'service' : 'layanan',
        target_id: isSourceLayanan ? selectedService.id : layanaId,
        connection_type: connectionType,
        propagation_enabled: propagationEnabled,
        workspace_id: workspaceId,
      };

      await onConnect(connectionData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create layana-service connection:', error);
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitting(false);
    setConnectionType('connects_to');
    setPropagationEnabled(true);
    setSelectedCmdbItem(null);
    setSelectedService(null);
    setSelectedServiceItem(null);
    setServices([]);
    setServiceItems([]);
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      resetForm();
    }
    onClose(isOpen);
  };

  const getConnectionTypeLabel = (typeSlug) => {
    return CONNECTION_TYPES[typeSlug]?.label || typeSlug;
  };

  const getConnectionTypeDescription = (typeSlug) => {
    return CONNECTION_TYPES[typeSlug]?.short_desc || '';
  };

  const isFormValid = selectedCmdbItem && selectedService && connectionType;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isSourceLayanan ? 'Koneksi Layanan → Service' : 'Koneksi Service → Layanan'}
          </DialogTitle>
          <DialogDescription>
            Buat koneksi antara layanan dan service dengan tipe koneksi yang sesuai.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Info */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              {isSourceLayanan ? 'Layanan (Source)' : 'Service (Source)'}
            </Label>
            <div className="p-3 bg-muted rounded-lg border">
              <p className="font-medium">{sourceNode?.data?.name || 'Unknown'}</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-2xl text-muted-foreground">↓</div>
          </div>

          {/* Target Selection - Cascading Dropdowns */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground">
              {isSourceLayanan ? 'Service (Target)' : 'Layanan (Target)'}
            </Label>

            {/* Step 1: CMDB Item */}
            <div className="space-y-2">
              <Label htmlFor="cmdb-item" className="text-xs">1. Pilih CMDB Item</Label>
              <Select
                value={selectedCmdbItem?.id?.toString() || ''}
                onValueChange={(value) => {
                  const item = cmdbItems.find(i => i.id.toString() === value);
                  setSelectedCmdbItem(item || null);
                }}
                disabled={loadingCmdbItems}
              >
                <SelectTrigger id="cmdb-item">
                  <SelectValue placeholder={loadingCmdbItems ? 'Memuat...' : 'Pilih CMDB Item'} />
                </SelectTrigger>
                <SelectContent>
                  {cmdbItems.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Service */}
            <div className="space-y-2">
              <Label htmlFor="service" className="text-xs">2. Pilih Service</Label>
              <Select
                value={selectedService?.id?.toString() || ''}
                onValueChange={(value) => {
                  const svc = services.find(s => s.id.toString() === value);
                  setSelectedService(svc || null);
                }}
                disabled={!selectedCmdbItem || loadingServices}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder={
                    !selectedCmdbItem ? 'Pilih CMDB item dulu' :
                    loadingServices ? 'Memuat...' :
                    'Pilih Service'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Service Item (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="service-item" className="text-xs">3. Pilih Service Item (Opsional)</Label>
              <Select
                value={selectedServiceItem?.id?.toString() || ''}
                onValueChange={(value) => {
                  const item = serviceItems.find(i => i.id.toString() === value);
                  setSelectedServiceItem(item || null);
                }}
                disabled={!selectedService || loadingServiceItems}
              >
                <SelectTrigger id="service-item">
                  <SelectValue placeholder={
                    !selectedService ? 'Pilih service dulu' :
                    loadingServiceItems ? 'Memuat...' :
                    'Pilih Service Item (opsional)'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {serviceItems.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              id="layanan-propagation"
              checked={propagationEnabled}
              onChange={(e) => setPropagationEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="layanan-propagation" className="text-sm font-medium cursor-pointer">
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Menyimpan...' : 'Buat Koneksi'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

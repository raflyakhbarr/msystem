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
import { CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';

/**
 * QuickServiceToServiceConnection - Modal untuk membuat koneksi antar service
 *
 * Props:
 * - open: Boolean untuk mengontrol visibility modal
 * - onClose: Callback ketika modal ditutup
 * - onConnect: Callback untuk membuat koneksi (sourceServiceId, targetServiceId, connectionType)
 * - sourceService: Source service object
 * - targetService: Target service object
 * - existingConnection: Existing connection object (jika edit mode)
 */
export default function QuickServiceToServiceConnection({
  open,
  onClose,
  onConnect,
  sourceService,
  targetService,
  existingConnection = null
}) {
  const [connectionType, setConnectionType] = useState(existingConnection?.connection_type || 'connects_to');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setConnectionType(existingConnection?.connection_type || 'connects_to');
    }
  }, [open, existingConnection]);

  const handleSubmit = async () => {
    if (!sourceService || !targetService) return;

    setIsSubmitting(true);
    try {
      await onConnect(
        sourceService.id,
        targetService.id,
        connectionType
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingConnection ? 'Edit Koneksi Service' : 'Koneksi Service-to-Service'}
          </DialogTitle>
        </DialogHeader>

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
              disabled={isSubmitting || !connectionType}
            >
              {isSubmitting ? 'Menyimpan...' : existingConnection ? 'Update' : 'Buat Koneksi'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

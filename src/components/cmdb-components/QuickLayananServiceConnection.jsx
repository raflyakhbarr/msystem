import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
 * QuickLayananServiceConnection - Simple modal for creating layana-to-service connections
 *
 * Props:
 * - open: Boolean for modal visibility
 * - onClose: Callback when modal is closed
 * - onConnect: Callback to create connection (sourceId, targetId, sourceType, targetType, connectionType)
 * - sourceName: Source entity name (layana or service)
 * - targetName: Target entity name (layana or service)
 * - isSourceLayanan: Boolean indicating if source is layana
 */
export default function QuickLayananServiceConnection({
  open,
  onClose,
  onConnect,
  sourceName,
  targetName,
  isSourceLayanan = true
}) {
  const [connectionType, setConnectionType] = useState('connects_to');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConnect(connectionType);
      onClose();
    } catch (error) {
      console.error('Failed to create layana-service connection:', error);
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
            {isSourceLayanan ? 'Koneksi Layanan → Service' : 'Koneksi Service → Layanan'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Info */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              {isSourceLayanan ? 'Layanan (Source)' : 'Service (Source)'}
            </Label>
            <div className="p-3 bg-muted rounded-lg border">
              <p className="font-medium">{sourceName}</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-2xl text-muted-foreground">↓</div>
          </div>

          {/* Target Info */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              {isSourceLayanan ? 'Service (Target)' : 'Layanan (Target)'}
            </Label>
            <div className="p-3 bg-muted rounded-lg border">
              <p className="font-medium">{targetName}</p>
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
              {isSubmitting ? 'Menyimpan...' : 'Buat Koneksi'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

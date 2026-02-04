import React, { useState, useEffect } from 'react';
import {  Dialog,  DialogContent,  DialogHeader,  DialogTitle,} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {  Select,  SelectContent,  SelectItem,  SelectTrigger,  SelectValue,} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import {  Table,  TableHeader,  TableBody,  TableRow,  TableHead,  TableCell,} from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SystemItem, HeaderEntry } from '@/types';

interface EditModalProps {
  showModal: boolean;
  formData: Partial<SystemItem> | null;
  setFormData: (data: Partial<SystemItem> | null) => void;
  setShowModal: (show: boolean) => void;
  handleSubmit: (data: Partial<SystemItem>) => Promise<void> | void;
}

const EditModal = ({ showModal, formData, setFormData, setShowModal, handleSubmit }: EditModalProps) => {
  const [saving, setSaving] = useState(false);
  const [localHeaders, setLocalHeaders] = useState<HeaderEntry[]>([]);
  const [localIpWhitelist, setLocalIpWhitelist] = useState<string[]>([]);

  useEffect(() => {
    if (!showModal || !formData) {
      setLocalHeaders([]);
      setLocalIpWhitelist([]);
      return;
    }

    const headersValue = formData.headers;
    if (typeof headersValue === 'string' && (headersValue as string).trim()) {
      try {
        const parsed = JSON.parse(headersValue);
        const headersArray = Object.entries(parsed).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value: String(value)
        }));
        setLocalHeaders(headersArray);
      } catch (e) {
        setLocalHeaders([]);
      }
    } else if (Array.isArray(headersValue)) {
      setLocalHeaders(headersValue);
    } else {
      setLocalHeaders([]);
    }

    const ipWhitelistValue = formData.ip_whitelist;
    if (typeof ipWhitelistValue === 'string' && (ipWhitelistValue as string).trim()) {
      try {
        const parsed = JSON.parse(ipWhitelistValue);
        setLocalIpWhitelist(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setLocalIpWhitelist([]);
      }
    } else if (Array.isArray(ipWhitelistValue)) {
      setLocalIpWhitelist(ipWhitelistValue);
    } else {
      setLocalIpWhitelist([]);
    }
  }, [showModal, formData]);

  if (!showModal || !formData) {
    return null;
  }

  const addHeaderRow = () => {
    setLocalHeaders([
      ...localHeaders,
      { id: crypto.randomUUID(), key: '', value: '' }
    ]);
  };

  const removeHeaderRow = (id: string) => {
    setLocalHeaders(localHeaders.filter(h => h.id !== id));
  };

  const updateHeaderKey = (id: string, value: string) => {
    setLocalHeaders(localHeaders.map(h =>
      h.id === id ? { ...h, key: value } : h
    ));
  };

  const updateHeaderValue = (id: string, value: string) => {
    setLocalHeaders(localHeaders.map(h =>
      h.id === id ? { ...h, value: value } : h
    ));
  };

  const addIpWhitelistRow = () => {
    setLocalIpWhitelist([...localIpWhitelist, '']);
  };

  const removeIpWhitelistRow = (index: number) => {
    setLocalIpWhitelist(localIpWhitelist.filter((_, i) => i !== index));
  };

  const updateIpWhitelistValue = (index: number, value: string) => {
    setLocalIpWhitelist(localIpWhitelist.map((ip, i) =>
      i === index ? value : ip
    ));
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const headersObject: Record<string, string> = {};
    localHeaders.forEach(h => {
      if (h.key && h.value) {
        headersObject[h.key] = h.value;
      }
    });

    const headersString = Object.keys(headersObject).length > 0
      ? JSON.stringify(headersObject)
      : '';

    const ipWhitelistArray = localIpWhitelist.filter(ip => ip && ip.trim());

    const ipWhitelistString = ipWhitelistArray.length > 0
      ? JSON.stringify(ipWhitelistArray)
      : '';

    const dataToSubmit = {
      ...formData,
      headers: headersString,
      ip_whitelist: ipWhitelistString
    };

    try {
      setSaving(true);
      await handleSubmit(dataToSubmit);
      toast.success(formData?.id ? 'System updated successfully!' : 'System created successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save system';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {formData?.id ? 'Edit Sistem' : 'Tambah Sistem Baru'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit}>
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <Field>
              <FieldLabel>Nama</FieldLabel>
              <FieldContent>
                <Input
                  value={formData.nama}
                  onChange={(e) => handleChange('nama', e.target.value)}
                  placeholder="Enter system name"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>URL</FieldLabel>
              <FieldContent>
                <Input
                  value={formData.url}
                  onChange={(e) => handleChange('url', e.target.value)}
                  placeholder="Enter URL"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Destination</FieldLabel>
              <FieldContent>
                <Input
                  value={formData.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  placeholder="Enter destination"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Type API</FieldLabel>
              <FieldContent className="overflow-visible">
                <Select
                  value={formData.typeApi}
                  onValueChange={(value) => handleChange('typeApi', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select API type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_token">Not Token</SelectItem>
                    <SelectItem value="token">Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <FieldContent>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.status}
                    onCheckedChange={(checked) => handleChange('status', checked)}
                  />
                  <Label className="text-sm">
                    {formData.status ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Headers</FieldLabel>
              <FieldContent>
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={addHeaderRow}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Header
                  </Button>

                  {localHeaders.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[45%]">Header</TableHead>
                          <TableHead className="w-[45%]">Value</TableHead>
                          <TableHead className="w-[10%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {localHeaders.map((header, index) => (
                          <TableRow key={`${header.id}-${index}`}>
                            <TableCell>
                              <Input
                                type="text"
                                value={header.key}
                                onChange={(e) => updateHeaderKey(header.id, e.target.value)}
                                placeholder="e.g., Accept"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={header.value}
                                onChange={(e) => updateHeaderValue(header.id, e.target.value)}
                                placeholder="e.g., application/json"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeHeaderRow(header.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {localHeaders.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No headers added. Click "Add Header" to add custom headers.
                    </p>
                  )}
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>IP Whitelist</FieldLabel>
              <FieldContent>
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={addIpWhitelistRow}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add IP
                  </Button>

                  {localIpWhitelist.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[90%]">IP Address</TableHead>
                          <TableHead className="w-[10%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {localIpWhitelist.map((ip, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                type="text"
                                value={ip}
                                onChange={(e) => updateIpWhitelistValue(index, e.target.value)}
                                placeholder="e.g., 192.168.1.1"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeIpWhitelistRow(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {localIpWhitelist.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No IPs added. Click "Add IP" to add IPs to whitelist.
                    </p>
                  )}
                </div>
              </FieldContent>
            </Field>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                formData?.id ? 'Update Configuration' : 'Save Configuration'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModal;

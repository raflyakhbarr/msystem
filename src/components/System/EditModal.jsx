import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EditModal = ({ showModal, formData, setFormData, setShowModal, handleSubmit }) => {
  const [saving, setSaving] = useState(false);

  // Initialize headers from existing data
  useEffect(() => {
    if (!showModal || !formData || Array.isArray(formData.headers)) {
      return;
    }

    // If headers is a string (from backend), parse it to array
    if (typeof formData.headers === 'string' && formData.headers.trim()) {
      try {
        const parsed = JSON.parse(formData.headers);
        const headersArray = Object.entries(parsed).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value
        }));
        setFormData(prev => ({ ...prev, headers: headersArray }));
      } catch (e) {
        // If parsing fails, initialize with empty array
        setFormData(prev => ({ ...prev, headers: [] }));
      }
    } else {
      // Initialize with empty array if no headers exist
      setFormData(prev => ({ ...prev, headers: [] }));
    }
  }, [showModal, formData?.id]);

  // Initialize ip_whitelist from existing data (simple string array)
  useEffect(() => {
    if (!showModal || !formData) {
      return;
    }

    // If ip_whitelist is a string (from backend), parse it to array
    if (typeof formData.ip_whitelist === 'string' && formData.ip_whitelist.trim()) {
      try {
        const parsed = JSON.parse(formData.ip_whitelist);
        setFormData(prev => ({ ...prev, ip_whitelist: Array.isArray(parsed) ? parsed : [] }));
      } catch (e) {
        // If parsing fails, initialize with empty array
        setFormData(prev => ({ ...prev, ip_whitelist: [] }));
      }
    } else if (!Array.isArray(formData.ip_whitelist)) {
      // Initialize with empty array if no ip_whitelist exist
      setFormData(prev => ({ ...prev, ip_whitelist: [] }));
    }
  }, [showModal, formData?.id]);

  if (!showModal || !formData) {
    return null;
  }

  // Ensure headers is an array (useEffect handles this, but render happens first)
  const headers = Array.isArray(formData.headers) ? formData.headers : [];

  // Ensure ip_whitelist is an array
  const ipWhitelist = Array.isArray(formData.ip_whitelist) ? formData.ip_whitelist : [];

  // Helper functions for header management
  const addHeaderRow = () => {
    setFormData(prev => ({
      ...prev,
      headers: [
        ...(prev.headers || []),
        { id: crypto.randomUUID(), key: '', value: '' }
      ]
    }));
  };

  const removeHeaderRow = (id) => {
    setFormData(prev => ({
      ...prev,
      headers: (prev.headers || []).filter(h => h.id !== id)
    }));
  };

  const updateHeaderKey = (id, value) => {
    setFormData(prev => ({
      ...prev,
      headers: (prev.headers || []).map(h =>
        h.id === id ? { ...h, key: value } : h
      )
    }));
  };

  const updateHeaderValue = (id, value) => {
    setFormData(prev => ({
      ...prev,
      headers: (prev.headers || []).map(h =>
        h.id === id ? { ...h, value: value } : h
      )
    }));
  };

  // Helper functions for ip_whitelist management (simple string array)
  const addIpWhitelistRow = () => {
    setFormData(prev => ({
      ...prev,
      ip_whitelist: [...(prev.ip_whitelist || []), '']
    }));
  };

  const removeIpWhitelistRow = (index) => {
    setFormData(prev => ({
      ...prev,
      ip_whitelist: (prev.ip_whitelist || []).filter((_, i) => i !== index)
    }));
  };

  const updateIpWhitelistValue = (index, value) => {
    setFormData(prev => ({
      ...prev,
      ip_whitelist: (prev.ip_whitelist || []).map((ip, i) =>
        i === index ? value : ip
      )
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Convert headers array to JSON object string
    const headersObject = {};
    if (Array.isArray(formData.headers)) {
      formData.headers.forEach(h => {
        if (h.key && h.value) {
          headersObject[h.key] = h.value;
        }
      });
    }

    const headersString = Object.keys(headersObject).length > 0
      ? JSON.stringify(headersObject)
      : '';

    // Convert ip_whitelist array to JSON string (filter out empty values)
    const ipWhitelistArray = (Array.isArray(formData.ip_whitelist)
      ? formData.ip_whitelist
      : []
    ).filter(ip => ip && ip.trim());

    const ipWhitelistString = ipWhitelistArray.length > 0
      ? JSON.stringify(ipWhitelistArray)
      : '';

    // Create data to submit with converted headers and ip_whitelist
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
      toast.error(err?.message || 'Failed to save system');
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

                  {headers.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[45%]">Header</TableHead>
                          <TableHead className="w-[45%]">Value</TableHead>
                          <TableHead className="w-[10%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headers.map((header) => (
                          <TableRow key={header.id}>
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

                  {headers.length === 0 && (
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

                  {ipWhitelist.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[90%]">IP Address</TableHead>
                          <TableHead className="w-[10%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ipWhitelist.map((ip, index) => (
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

                  {ipWhitelist.length === 0 && (
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



// {
//             "id": 54,
//             "nama": "TPS",
//             "url": "tps.com",
//             "destination": "/api/tps",
//             "typeApi": "not_token",
//             "status": true,
//             "createdAt": "2025-12-15T06:56:57.695Z",
//             "updatedAt": "2025-12-18T06:59:48.327Z",
//             "headers": "{\"Accept\":\"application/json\"}",
//             "token": null
//         }
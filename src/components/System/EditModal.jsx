import React, { useState } from 'react';
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const EditModal = ({ showModal, formData, setFormData, setShowModal, handleSubmit }) => {
  const [saving, setSaving] = useState(false);

  if (!showModal || !formData) {
    return null;
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData };
    
    if (formData.headersType && formData.headersType !== 'none') {
      const acceptValue = formData.headersType === 'custom'
        ? formData.customHeadersType
        : formData.headersType;
      dataToSubmit.headers = `{"Accept": "${acceptValue}"}`;
    }
    
    delete dataToSubmit.headersType;
    delete dataToSubmit.customHeadersType;
    
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

            {formData.typeApi !== 'not_token' && (
              <>
                <Field>
                  <FieldLabel>Header</FieldLabel>
                  <FieldContent>
                    <Select
                      value={formData.headersType || 'none'}
                      onValueChange={(value) => handleChange('headersType', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        "Accept": "<SelectValue placeholder="Select content type" />"
                      </SelectTrigger>
                      <SelectContent> 
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="application/json">application/json</SelectItem>
                        <SelectItem value="application/xml">application/xml</SelectItem>
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                {formData.headersType === 'custom' && (
                  <Field>
                    <FieldLabel>Custom Content Type</FieldLabel>
                    <FieldContent>
                      <Input
                        type="text"
                        value={formData.customHeadersType || ''}
                        onChange={(e) => handleChange('customHeadersType', e.target.value)}
                        placeholder="Enter custom content type (e.g., application/soap+xml)"
                      />
                    </FieldContent>
                  </Field>
                )}


                <Field>
                  <FieldLabel>Token</FieldLabel>
                  <FieldContent>
                    <Input
                        type="text"
                        value={formData.token}
                        onChange={(e) => handleChange('token', e.target.value)}
                        placeholder="Leave empty if not required"
                      />
                  </FieldContent>
                </Field>
              </>
            )}
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

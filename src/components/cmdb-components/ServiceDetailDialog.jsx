import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ServiceIcon from './ServiceIcon';
import ServiceVisualization from './ServiceVisualization';
import { API_BASE_URL } from '../../utils/cmdb-utils/constants';
import api from "@/services/api";
import { toast } from "sonner";
import {
  Server,
  Activity,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function ServiceDetailDialog({ show, service, workspaceId, onClose }) {
  const [localStatus, setLocalStatus] = useState(service?.status || 'active');
  const [isUpdating, setIsUpdating] = useState(false);
  const isLocalUpdateRef = useRef(false);

  useEffect(() => {
    if (service) {
      setLocalStatus(service.status);
    }
  }, [service?.id, service?.status]);

  // Socket.io connection for real-time updates from OTHER clients
  useEffect(() => {
    if (!show || !service?.id || !workspaceId) return;

    const socket = io(import.meta.env.VITE_CMDB_API_BASE_URL, {
      reconnectionAttempts: 5
    });

    socket.on('service_update', (data) => {
      // Convert to number for comparison (backend might send string)
      const eventServiceId = parseInt(data.serviceId);
      const eventWorkspaceId = parseInt(data.workspaceId);
      const currentServiceId = parseInt(service.id);
      const currentWorkspaceId = parseInt(workspaceId);
      // Only update if this is for our service AND not from our local update
      if (eventServiceId === currentServiceId && eventWorkspaceId === currentWorkspaceId) {
        if (!isLocalUpdateRef.current) {
          // Fetch latest service data
          api.get(`/services/single/${service.id}`)
            .then(res => {
              setLocalStatus(res.data.status);
            })
            .catch(err => console.error('Failed to refresh service status:', err));
        } else {
          isLocalUpdateRef.current = false;
        }
      } else {

      }
    });

    return () => {
      socket.off('service_update');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [show, service?.id, workspaceId]);

  const handleStatusChange = async (newStatus) => {
    if (!service) return;

    setIsUpdating(true);
    setLocalStatus(newStatus);
    isLocalUpdateRef.current = true; // Mark as local update

    try {
      await api.patch(`/services/${service.id}/status`, { status: newStatus });
      toast.success('Status updated!');

      // Socket.io will handle real-time update to other clients
    } catch (err) {
      setLocalStatus(service.status);
      toast.error('Failed to update status: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      active: {
        icon: CheckCircle2,
        color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        label: 'Active'
      },
      inactive: {
        icon: AlertCircle,
        color: 'bg-red-500/10 text-red-700 border-red-200',
        dotColor: 'bg-red-500',
        label: 'Inactive'
      },
      maintenance: {
        icon: Clock,
        color: 'bg-amber-500/10 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        label: 'Maintenance'
      },
      disabled: {
        icon: AlertCircle,
        color: 'bg-gray-500/10 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-500',
        label: 'Disabled'
      }
    };
    return configs[status] || configs.active;
  };

  const statusConfig = getStatusConfig(localStatus);
  const StatusIcon = statusConfig.icon;

  // Guard clause - must be AFTER all hooks
  if (!service) return null;

  return (
    <>
      <style>{`
        .dialog-horizontal {
          max-width: 1600px !important;
          width: 95vw !important;
        }
      `}</style>
      <Dialog open={show} onOpenChange={onClose}>
        <DialogContent className="dialog-horizontal h-[85vh] p-0 gap-0 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
          <DialogHeader className="sr-only">
            <DialogTitle>{service.name} - Service Details</DialogTitle>
          </DialogHeader>
          <div className="flex h-full">
          {/* Left Panel - Service Information */}
          <div className="w-[380px] bg-white border-r border-slate-200/60 flex flex-col">
            {/* Header */}
            <div className="p-8 pb-6 space-y-6">
              {/* Icon and Title */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                    {service.icon_type === 'preset' ? (
                      <ServiceIcon name={service.icon_name} size={32} className="text-white" />
                    ) : (
                      <img
                        src={`${API_BASE_URL}${service.icon_path}`}
                        alt={service.name}
                        className="w-8 h-8 object-contain"
                      />
                    )}
                  </div>
                  {/* Status Indicator Dot */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusConfig.dotColor} rounded-full border-2 border-white shadow-sm`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 break-words">
                    {service.name}
                  </h2>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${statusConfig.color}`}>
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </div>
                </div>
              </div>

              {/* Description */}
              {service.description && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              )}
            </div>

            <Separator className="bg-slate-200/60" />

            {/* Service Details */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Service Details
                </h3>
                
                <div className="space-y-4">
                  {/* Type */}
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Server size={16} className="text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Type</p>
                      <p className="text-sm font-semibold text-slate-900 capitalize">
                        {service.type || 'Service'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-start gap-3 group">
                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Activity size={16} className="text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Status</p>
                      <Select
                        value={localStatus}
                        onValueChange={handleStatusChange}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Inactive
                            </div>
                          </SelectItem>
                          <SelectItem value="maintenance">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              Maintenance
                            </div>
                          </SelectItem>
                          <SelectItem value="disabled">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-500" />
                              Disabled
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Category */}
                  {service.category && (
                    <div className="flex items-start gap-3 group">
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                        <MapPin size={16} className="text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 mb-0.5">Category</p>
                        <p className="text-sm font-semibold text-slate-900 capitalize">
                          {service.category}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  {service.created_at && (
                    <div className="flex items-start gap-3 group">
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                        <Calendar size={16} className="text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 mb-0.5">Created</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(service.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(service.location || service.owner) && (
                <>
                  <Separator className="bg-slate-200/60" />
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                      Additional Information
                    </h3>
                    
                    <div className="space-y-3">
                      {service.location && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
                          <p className="text-xs font-medium text-slate-500 mb-1">Location</p>
                          <p className="text-sm text-slate-900">{service.location}</p>
                        </div>
                      )}
                      
                      {service.owner && (
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/60">
                          <p className="text-xs font-medium text-slate-500 mb-1">Owner</p>
                          <p className="text-sm text-slate-900">{service.owner}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200/60">
              <p className="text-xs text-slate-500 text-center">
                Service ID: {service.id}
              </p>
            </div>
          </div>

          {/* Right Panel - Visualization */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Visualization Header */}
            <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Service Architecture
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Visual representation of service components and their connections
                  </p>
                </div>
              </div>
            </div>

            {/* Visualization Content */}
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <ServiceVisualization
                  service={service}
                  workspaceId={workspaceId}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
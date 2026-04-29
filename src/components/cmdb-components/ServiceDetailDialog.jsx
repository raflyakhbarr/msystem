import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ServiceIcon from './ServiceIcon';
import ServiceVisualization from './ServiceVisualization';
import ServiceToServiceConnectionModal from './ServiceToServiceConnectionModal';
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
  Clock,
  Network,
  Plus,
  Trash2
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';

export default function ServiceDetailDialog({ show, service, workspaceId, onClose, cmdbItem }) {
  const [localStatus, setLocalStatus] = useState(service?.status || 'active');
  const [isUpdating, setIsUpdating] = useState(false);
  const isLocalUpdateRef = useRef(false);
  const { socket } = useSocket();

  // Service-to-service connections state
  const [showServiceConnectionModal, setShowServiceConnectionModal] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [serviceConnections, setServiceConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Service item connections (cross-service) state
  const [serviceItemConnections, setServiceItemConnections] = useState([]);
  const [loadingServiceItemConnections, setLoadingServiceItemConnections] = useState(false);
  const [allServiceItems, setAllServiceItems] = useState([]);

  // Connection type options
  const connectionTypes = [
    { value: 'depends_on', label: 'Depends On', color: 'bg-red-500' },
    { value: 'consumed_by', label: 'Consumed By', color: 'bg-orange-500' },
    { value: 'connects_to', label: 'Connects To', color: 'bg-blue-500' },
    { value: 'contains', label: 'Contains', color: 'bg-purple-500' },
    { value: 'managed_by', label: 'Managed By', color: 'bg-cyan-500' },
    { value: 'data_flow_to', label: 'Data Flow To', color: 'bg-green-500' },
    { value: 'backup_to', label: 'Backup To', color: 'bg-indigo-500' },
    { value: 'hosted_on', label: 'Hosted On', color: 'bg-amber-500' },
    { value: 'related_to', label: 'Related To', color: 'bg-gray-500' },
  ];

  // Debug: Log props when dialog opens
  useEffect(() => {
    if (show) {
      console.log('🔍 ServiceDetailDialog props:', {
        show,
        serviceId: service?.id,
        serviceName: service?.name,
        workspaceId,
        cmdbItemId: cmdbItem?.id,
        cmdbItemName: cmdbItem?.name,
        cmdbItemExists: !!cmdbItem,
        allServicesCount: allServices.length
      });

      if (!cmdbItem) {
        console.warn('⚠️ ServiceDetailDialog: cmdbItem is null/undefined!');
        console.warn('⚠️ This means parent item lookup failed in handleServiceClick');
      }
    }
  }, [show, service, workspaceId, cmdbItem, allServices.length]);

  // Update local status when service prop changes (when dialog opens with new data)
  useEffect(() => {
    if (service) {
      setLocalStatus(service.status);
    }
  }, [service?.id, service?.status]);

  // Fetch latest service data when dialog opens
  useEffect(() => {
    if (show && service?.id) {
      // Fetch the latest service data when dialog opens
      api.get(`/services/single/${service.id}`)
        .then(res => {
          setLocalStatus(res.data.status);
          console.log('✅ ServiceDetailDialog: Fetched latest status on open:', res.data.status);
        })
        .catch(err => console.error('Failed to fetch service status:', err));
    }
  }, [show, service?.id]);

  // Listen for service updates from SocketContext (always active, even when dialog is closed)
  useEffect(() => {
    if (!socket || !service?.id || !workspaceId) return;

    const handleServiceUpdate = async (data) => {
      // Convert to number for comparison (backend might send string)
      const eventServiceId = parseInt(data.serviceId);
      const eventWorkspaceId = parseInt(data.workspaceId);
      const currentServiceId = parseInt(service.id);
      const currentWorkspaceId = parseInt(workspaceId);

      // Only update if this is for our service AND same workspace
      if (eventServiceId === currentServiceId && eventWorkspaceId === currentWorkspaceId) {
        if (!isLocalUpdateRef.current) {
          console.log('🔄 ServiceDetailDialog: Received service_update, fetching latest status...');
          // Fetch latest service data
          try {
            const res = await api.get(`/services/single/${service.id}`);
            setLocalStatus(res.data.status);
            console.log('✅ ServiceDetailDialog: Updated status to', res.data.status);
          } catch (err) {
            console.error('Failed to refresh service status:', err);
          }
        } else {
          console.log('🔄 ServiceDetailDialog: Ignoring local update');
          isLocalUpdateRef.current = false;
        }
      }
    };

    socket.on('service_update', handleServiceUpdate);

    return () => {
      socket.off('service_update', handleServiceUpdate);
    };
  }, [socket, service?.id, workspaceId]);

  // Fetch ALL services in workspace (not just parent CMDB item) for cross-item connections
  useEffect(() => {
    if (!show || !workspaceId) {
      setAllServices([]);
      return;
    }

    const fetchAllWorkspaceServices = async () => {
      console.log('🔍 ServiceDetailDialog: Fetching ALL services in workspace:', workspaceId);
      try {
        // Fetch all CMDB items in workspace first
        const itemsResponse = await api.get(`/cmdb?workspace_id=${workspaceId}`);
        const items = itemsResponse.data || [];

        // Fetch services for each CMDB item
        const servicesPromises = items.map(async (item) => {
          try {
            const servicesResponse = await api.get(`/services/${item.id}`);
            return (servicesResponse.data || []).map(svc => ({
              ...svc,
              cmdb_item_id: item.id,
              cmdb_item_name: item.name
            }));
          } catch (err) {
            console.error(`Failed to fetch services for item ${item.id}:`, err);
            return [];
          }
        });

        const allServicesArrays = await Promise.all(servicesPromises);
        const flatServices = allServicesArrays.flat();

        console.log('✅ ServiceDetailDialog: Fetched', flatServices.length, 'services from', items.length, 'CMDB items');
        setAllServices(flatServices);
      } catch (err) {
        console.error('❌ Failed to fetch workspace services:', err);
        setAllServices([]);
      }
    };

    fetchAllWorkspaceServices();
  }, [show, workspaceId]);

  // Fetch service-to-service connections
  useEffect(() => {
    if (!show || !cmdbItem) {
      setServiceConnections([]);
      return;
    }

    const fetchServiceConnections = async () => {
      setLoadingConnections(true);
      try {
        const response = await api.get(`/service-to-service-connections/item/${cmdbItem.id}`);
        setServiceConnections(response.data || []);
      } catch (err) {
        console.error('Failed to fetch service connections:', err);
        setServiceConnections([]);
      } finally {
        setLoadingConnections(false);
      }
    };

    fetchServiceConnections();
  }, [show, cmdbItem]);

  // Fetch cross-service connections (service item to service item)
  useEffect(() => {
    if (!show || !service?.id) {
      setServiceItemConnections([]);
      return;
    }

    const fetchCrossServiceConnections = async () => {
      setLoadingServiceItemConnections(true);
      try {
        const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
        const allConnections = response.data || [];

        // Filter connections that involve this service
        const relatedConnections = allConnections.filter(conn =>
          conn.source_service_id === service.id || conn.target_service_id === service.id
        );

        setServiceItemConnections(relatedConnections);
      } catch (err) {
        console.error('Failed to fetch cross-service connections:', err);
        setServiceItemConnections([]);
      } finally {
        setLoadingServiceItemConnections(false);
      }
    };

    fetchCrossServiceConnections();
  }, [show, service?.id, workspaceId]);

  // Fetch all service items for display
  useEffect(() => {
    if (!show || !allServices.length) {
      setAllServiceItems([]);
      return;
    }

    const fetchAllServiceItems = async () => {
      try {
        const serviceItemsPromises = allServices.map(async (svc) => {
          try {
            const response = await api.get(`/service-items/${svc.id}/items`, {
              params: { workspace_id: workspaceId }
            });
            return (response.data || []).map(item => ({
              ...item,
              service_id: svc.id,
              service_name: svc.name,
              cmdb_item_name: svc.cmdb_item_name
            }));
          } catch (err) {
            console.error(`Failed to fetch service items for service ${svc.id}:`, err);
            return [];
          }
        });

        const allItemsArrays = await Promise.all(serviceItemsPromises);
        const flatItems = allItemsArrays.flat();
        setAllServiceItems(flatItems);
      } catch (err) {
        console.error('Failed to fetch service items:', err);
        setAllServiceItems([]);
      }
    };

    fetchAllServiceItems();
  }, [show, allServices, workspaceId]);

  const handleConnectionUpdate = async () => {
    if (!cmdbItem) return;

    // Refresh service-to-service connections after modal closes
    try {
      const response = await api.get(`/service-to-service-connections/item/${cmdbItem.id}`);
      setServiceConnections(response.data || []);
    } catch (err) {
      console.error('Failed to refresh connections:', err);
    }

    // Also refresh cross-service connections
    try {
      const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
      const allConnections = response.data || [];
      const relatedConnections = allConnections.filter(conn =>
        conn.source_service_id === service.id || conn.target_service_id === service.id
      );
      setServiceItemConnections(relatedConnections);
    } catch (err) {
      console.error('Failed to refresh cross-service connections:', err);
    }
  };

  const handleDeleteConnection = async (connectionId) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      await api.delete(`/service-to-service-connections/${connectionId}`);

      // Refresh connections
      const response = await api.get(`/service-to-service-connections/item/${cmdbItem.id}`);
      setServiceConnections(response.data || []);

      toast.success('Connection deleted successfully!');
    } catch (err) {
      console.error('Failed to delete connection:', err);
      toast.error(err.response?.data?.error || 'Failed to delete connection');
    }
  };

  const handleDeleteServiceItemConnection = async (connectionId) => {
    if (!confirm('Are you sure you want to delete this service item connection?')) return;

    try {
      await api.delete(`/cross-service-connections/${connectionId}`);

      // Refresh cross-service connections
      const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
      const allConnections = response.data || [];
      const relatedConnections = allConnections.filter(conn =>
        conn.source_service_id === service.id || conn.target_service_id === service.id
      );
      setServiceItemConnections(relatedConnections);

      toast.success('Service item connection deleted successfully!');
    } catch (err) {
      console.error('Failed to delete service item connection:', err);
      toast.error(err.response?.data?.error || 'Failed to delete connection');
    }
  };

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

  const getConnectionTypeLabel = (type) => {
    return connectionTypes.find(ct => ct.value === type)?.label || type;
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .scroll-smooth {
          scroll-behavior: smooth;
        }
        .custom-scrollbar:hover {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #f1f5f9;
        }
      `}</style>
      <Dialog open={show} onOpenChange={onClose}>
        <DialogContent className="dialog-horizontal h-[85vh] p-0 gap-0 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
          <DialogHeader className="sr-only">
            <DialogTitle>{service.name} - Service Details</DialogTitle>
          </DialogHeader>
          <div className="flex h-full min-h-0">
          {/* Left Panel - Service Information */}
          <div className="w-[380px] bg-white border-r border-slate-200/60 flex flex-col min-h-0">
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
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar scroll-smooth">
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

              {/* Service-to-Service Connections */}
              <>
                <Separator className="bg-slate-200/60" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Service Connections
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {serviceConnections.length} {serviceConnections.length !== 1 ? 'Connections' : 'Connection'}
                      </Badge>
                      {cmdbItem && allServices.length >= 2 && (
                        <Button
                          onClick={() => setShowServiceConnectionModal(true)}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                        >
                          <Plus size={14} className="mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>

                  {cmdbItem ? (
                    loadingConnections ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    ) : serviceConnections.length === 0 ? (
                      <div className="text-center py-8">
                        <Network size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No service connections yet.</p>
                        {allServices.length >= 2 ? (
                          <p className="text-xs text-slate-400 mt-1">
                            Click "Add" to create a connection between services.
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1">
                            You need at least 2 services to create connections.
                          </p>
                        )}
                      </div>
                    ) : (
                      <ScrollArea className="h-[240px] w-full pr-4 custom-scrollbar">
                        <div className="space-y-2 pr-2">
                          {serviceConnections.map((conn) => {
                            const sourceService = allServices.find(s => s.id === conn.source_service_id);
                            const targetService = allServices.find(s => s.id === conn.target_service_id);
                            const connectionTypeConfig = connectionTypes.find(ct => ct.value === conn.connection_type);

                            return (
                              <div
                                key={conn.id}
                                className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors text-xs"
                              >
                                {/* Source Service */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        sourceService?.status === 'active' ? 'bg-green-500' :
                                        sourceService?.status === 'inactive' ? 'bg-red-500' :
                                        sourceService?.status === 'maintenance' ? 'bg-yellow-500' :
                                        'bg-gray-500'
                                      }`}
                                    />
                                    <span className="font-medium truncate">{sourceService?.name || 'Unknown'}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {sourceService?.cmdb_item_name || 'Unknown CMDB'}
                                  </div>
                                </div>

                                {/* Connection Type & Direction */}
                                <div className="flex flex-col items-center gap-0.5 px-2">
                                  <Badge className="text-[10px] px-1.5 py-0" variant="secondary">
                                    {connectionTypeConfig?.label || conn.connection_type}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {conn.direction === 'forward' ? '→' : conn.direction === 'backward' ? '←' : '↔'}
                                  </span>
                                </div>

                                {/* Target Service */}
                                <div className="flex-1 min-w-0 text-right">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <span className="font-medium truncate">{targetService?.name || 'Unknown'}</span>
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        targetService?.status === 'active' ? 'bg-green-500' :
                                        targetService?.status === 'inactive' ? 'bg-red-500' :
                                        targetService?.status === 'maintenance' ? 'bg-yellow-500' :
                                        'bg-gray-500'
                                      }`}
                                    />
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {targetService?.cmdb_item_name || 'Unknown CMDB'}
                                  </div>
                                </div>

                                {/* Delete Button */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteConnection(conn.id)}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )
                  ) : (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200/60">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <AlertCircle size={18} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            CMDB Item Not Available
                          </p>
                          <p className="text-xs text-slate-500">
                            Unable to load CMDB item information. Please check browser console for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>

              {/* Service Item Connections (Cross-Service) */}
              <>
                <Separator className="bg-slate-200/60" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Service Item Connections
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {serviceItemConnections.length} {serviceItemConnections.length !== 1 ? 'Connections' : 'Connection'}
                    </Badge>
                  </div>

                  {loadingServiceItemConnections ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : serviceItemConnections.length === 0 ? (
                    <div className="text-center py-8">
                      <Network size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No service item connections yet.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Service item connections are created by dragging edges between service items.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[240px] w-full pr-4 custom-scrollbar">
                      <div className="space-y-2 pr-2">
                        {serviceItemConnections.map((conn) => {
                          const sourceService = allServices.find(s => s.id === conn.source_service_id);
                          const targetService = allServices.find(s => s.id === conn.target_service_id);
                          const sourceServiceItem = allServiceItems.find(item => item.id === conn.source_service_item_id);
                          const targetServiceItem = allServiceItems.find(item => item.id === conn.target_service_item_id);
                          const connectionTypeConfig = connectionTypes.find(ct => ct.value === conn.connection_type);

                          return (
                            <div
                              key={conn.id}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors text-xs"
                            >
                              {/* Source Service Item */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                                  <span className="font-medium truncate">{sourceServiceItem?.name || 'Unknown'}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {sourceService?.name || 'Unknown Service'}
                                </div>
                              </div>

                              {/* Connection Type */}
                              <div className="flex flex-col items-center gap-0.5 px-2">
                                <Badge className="text-[10px] px-1.5 py-0" variant="secondary">
                                  {connectionTypeConfig?.label || conn.connection_type}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">→</span>
                              </div>

                              {/* Target Service Item */}
                              <div className="flex-1 min-w-0 text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="font-medium truncate">{targetServiceItem?.name || 'Unknown'}</span>
                                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {targetService?.name || 'Unknown Service'}
                                </div>
                              </div>

                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteServiceItemConnection(conn.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>

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

    {/* Service-to-Service Connections Modal */}
    {showServiceConnectionModal && (
      <ServiceToServiceConnectionModal
        show={showServiceConnectionModal}
        onClose={() => setShowServiceConnectionModal(false)}
        cmdbItem={cmdbItem}
        services={allServices}
        currentService={service}
        onConnectionUpdate={async () => {
          if (!workspaceId) return;
          // Refresh ALL workspace services after connection update (for cross-item connections)
          try {
            console.log('🔄 Refreshing ALL workspace services after connection update...');
            const itemsResponse = await api.get(`/cmdb?workspace_id=${workspaceId}`);
            const items = itemsResponse.data || [];

            const servicesPromises = items.map(async (item) => {
              const response = await api.get(`/services/${item.id}`);
              return (response.data || []).map(svc => ({
                ...svc,
                cmdb_item_id: item.id,
                cmdb_item_name: item.name
              }));
            });

            const allServicesArrays = await Promise.all(servicesPromises);
            const flatServices = allServicesArrays.flat();

            setAllServices(flatServices);
            console.log('✅ All workspace services refreshed:', flatServices.length);

            // Also refresh service connections list
            await handleConnectionUpdate();
          } catch (err) {
            console.error('❌ Failed to refresh services:', err);
          }
        }}
      />
    )}
  </>
  );
}
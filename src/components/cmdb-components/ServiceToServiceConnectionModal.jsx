import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Check, Briefcase, Layers,
  ArrowUpRight, ArrowDownRight, Link2, Shield, TrendingUp, RefreshCw, ArrowRight,
  Server, Key, Puzzle, ArrowUp, ArrowDown, Lock, ShieldCheck, Eye, Scale, Zap,
  Database, Workflow, Route, ChevronsUpDown
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Helper function to get icon for connection type
function getConnectionIcon(iconName) {
  const icons = {
    'arrow-up-right': <ArrowUpRight className="h-4 w-4" />,
    'arrow-down-right': <ArrowDownRight className="h-4 w-4" />,
    'link': <Link2 className="h-4 w-4" />,
    'layers': <Layers className="h-4 w-4" />,
    'shield': <Shield className="h-4 w-4" />,
    'trending-up': <TrendingUp className="h-4 w-4" />,
    'refresh-cw': <RefreshCw className="h-4 w-4" />,
    'server': <Server className="h-4 w-4" />,
    'key': <Key className="h-4 w-4" />,
    'puzzle': <Puzzle className="h-4 w-4" />,
    'arrow-up': <ArrowUp className="h-4 w-4" />,
    'arrow-down': <ArrowDown className="h-4 w-4" />,
    'lock': <Lock className="h-4 w-4" />,
    'shield-check': <ShieldCheck className="h-4 w-4" />,
    'eye': <Eye className="h-4 w-4" />,
    'scale': <Scale className="h-4 w-4" />,
    'zap': <Zap className="h-4 w-4" />,
    'database': <Database className="h-4 w-4" />,
    'workflow': <Workflow className="h-4 w-4" />,
    'route': <Route className="h-4 w-4" />,
  };
  return icons[iconName] || <ArrowRight className="h-4 w-4" />;
}

// Mini Connection Preview Component
export function MiniConnectionPreview({ connectionType, sourceName, targetName }) {
  const getArrowDirection = () => {
    switch (connectionType.default_direction) {
      case 'backward':
        return '←';
      case 'forward':
        return '→';
      case 'bidirectional':
        return '↔';
      default:
        return '→';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="max-w-16 truncate" title={sourceName}>{sourceName}</span>
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded text-white font-medium"
        style={{ backgroundColor: connectionType.color }}
        title={connectionType.label}
      >
        {getArrowDirection()}
      </div>
      <span className="max-w-16 truncate" title={targetName}>{targetName}</span>
    </div>
  );
}

// Connection Type Selector Component
export function ConnectionTypeSelector({
  value,
  onChange,
  connectionTypes,
  placeholder = "Pilih tipe koneksi",
  size = "default",
  className = ""
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedType = connectionTypes.find(ct => ct.type_slug === value);

  const filteredTypes = connectionTypes.filter(ct => {
    const searchLower = searchQuery.toLowerCase();
    return (
      ct.label.toLowerCase().includes(searchLower) ||
      ct.type_slug.toLowerCase().includes(searchLower) ||
      (ct.description && ct.description.toLowerCase().includes(searchLower))
    );
  });

  const sizeClasses = size === "small" ? "h-7 text-xs" : "";

  return (
    <>
      <Button
        variant="outline"
        className={`w-full justify-between ${sizeClasses} ${className}`}
        onClick={() => setShowDialog(true)}
      >
        {selectedType ? (
          <div className="flex items-center gap-2">
            {getConnectionIcon(selectedType.icon)}
            <span>{selectedType.label}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      {/* Separate Dialog for Connection Type Selection */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Tipe Koneksi</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false}>
            <div className="p-3 border-b">
              <CommandInput
                placeholder="Cari tipe koneksi..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList style={{ maxHeight: size === 'small' ? '200px' : '400px', overflowY: 'auto' }}>
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada tipe koneksi ditemukan
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredTypes.map((ct) => (
                  <CommandItem
                    key={ct.id}
                    value={ct.type_slug}
                    onSelect={() => {
                      onChange(ct.type_slug);
                      setShowDialog(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    {getConnectionIcon(ct.icon)}
                    <span className={`font-medium ${size === "small" ? "text-xs" : "text-sm"}`}>{ct.label}</span>
                    {value === ct.type_slug && (
                      <Check size={14} className="text-primary ml-auto" />
                    )}
                    {ct.description && size !== "small" && (
                      <p className="text-xs text-muted-foreground truncate ml-2">
                        {ct.description}
                      </p>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Service Selector with Grouping Support
export function ServiceSelector({
  services,
  value,
  onChange,
  placeholder = "Select service...",
  excludeIds = [],
  currentServiceId = null
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Group services by CMDB item
  const groupedServices = services.reduce((acc, service) => {
    const key = service.cmdb_item_name || 'Unknown CMDB Item';
    if (!acc[key]) {
      acc[key] = [];
    }
    // Exclude current service and any excluded IDs
    if (service.id !== currentServiceId && !excludeIds.includes(service.id)) {
      acc[key].push(service);
    }
    return acc;
  }, {});

  // Filter based on search
  const filteredGroups = Object.entries(groupedServices).reduce((acc, [cmdbItemName, servicesList]) => {
    const filtered = servicesList.filter(service =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmdbItemName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[cmdbItemName] = filtered;
    }
    return acc;
  }, {});

  const selectedService = services.find(s => s.id === value);

  const handleSelect = (serviceId) => {
    onChange(serviceId);
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedService ? (
            <div className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="truncate">{selectedService.name}</span>
              {selectedService.cmdb_item_name && (
                <span className="text-xs text-muted-foreground truncate">
                  ({selectedService.cmdb_item_name})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 z-[10002] w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput
            placeholder="Cari service..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Tidak ada service ditemukan</CommandEmpty>
            {Object.entries(filteredGroups).map(([cmdbItemName, servicesList], groupIdx) => (
              <div key={cmdbItemName}>
                <CommandGroup heading={cmdbItemName}>
                  {servicesList.map((service) => (
                    <CommandItem
                      key={service.id}
                      value={service.name}
                      onSelect={() => handleSelect(service.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === service.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Briefcase className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="font-medium">{service.name}</span>
                      {service.id === currentServiceId && (
                        <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {groupIdx < Object.entries(filteredGroups).length - 1 && (
                  <CommandSeparator />
                )}
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * ServiceToServiceConnectionModal
 *
 * Modal untuk mengelola koneksi antar services (bisa lintas CMDB item!).
 *
 * Props:
 * - show: boolean - Apakah modal ditampilkan
 * - onClose: function - Callback ketika modal ditutup
 * - cmdbItem: object - CMDB item data (opsional)
 * - services: array - Array of ALL services in workspace
 * - currentService: object - Service yang sedang dibuka (auto-select as source)
 * - onConnectionUpdate: function - Callback ketika connection di-update
 */
export default function ServiceToServiceConnectionModal({
  show,
  onClose,
  cmdbItem,
  services,
  currentService,
  onConnectionUpdate,
  isSharedView = false
}) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSourceService, setSelectedSourceService] = useState(null);
  const [selectedTargetService, setSelectedTargetService] = useState(null);
  const [connectionType, setConnectionType] = useState('connects_to');
  const [connectionTypes, setConnectionTypes] = useState([]);

  // Fetch connection types from database
  useEffect(() => {
    if (isSharedView) {
      return;
    }

    const fetchConnectionTypes = async () => {
      try {
        const response = await api.get('/cmdb/connection-types');
        setConnectionTypes(response.data);
        // Set default to first connection type
        if (response.data.length > 0 && !connectionType) {
          setConnectionType(response.data[0].type_slug);
        }
      } catch (error) {
        console.error('Failed to fetch connection types:', error);
        toast.error('Gagal memuat tipe koneksi');
      }
    };

    if (show) {
      fetchConnectionTypes();
    }
  }, [show, isSharedView]);

  // Fetch connections when modal opens & auto-select current service as source
  useEffect(() => {
    if (isSharedView) {
      return;
    }

    if (show && cmdbItem) {
      // Auto-select current service as source if available
      if (currentService) {
        setSelectedSourceService(currentService);
      }
      fetchConnections();
    }
  }, [show, cmdbItem, currentService, isSharedView]);

  const fetchConnections = async () => {
    if (!cmdbItem) return;
    if (isSharedView) return; // Skip in shared view

    setLoading(true);
    try {
      // For now, fetch connections by primary CMDB item (can be enhanced later)
      const response = await api.get(`/service-to-service-connections/item/${cmdbItem.id}`);
      setConnections(response.data || []);
    } catch (err) {
      console.error('Failed to fetch service-to-service connections:', err);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnection = async () => {
    // Prevent creation in shared view
    if (isSharedView) {
      toast.info('🔒 View-only mode: Cannot create connections in shared view');
      return;
    }

    if (!selectedSourceService || !selectedTargetService) {
      toast.error('Please select both source and target services');
      return;
    }

    if (selectedSourceService.id === selectedTargetService.id) {
      toast.error('Source and target services cannot be the same');
      return;
    }

    // Get connection type details to determine direction
    const connectionTypeDetails = connectionTypes.find(ct => ct.type_slug === connectionType);
    const direction = connectionTypeDetails?.default_direction || 'forward';

    setLoading(true);
    try {
      const connectionData = {
        cmdb_item_id: cmdbItem?.id || selectedSourceService?.cmdb_item_id,
        source_service_id: selectedSourceService.id,
        target_service_id: selectedTargetService.id,
        workspace_id: selectedSourceService?.workspace_id || selectedTargetService?.workspace_id || cmdbItem?.workspace_id,
        connection_type: connectionType,
        direction: direction
      };

      const response = await api.post('/service-to-service-connections', connectionData);

      await fetchConnections();
      // Reset form but keep it open
      setSelectedSourceService(currentService || null);
      setSelectedTargetService(null);
      onConnectionUpdate?.();
      toast.success('Koneksi berhasil dibuat');
    } catch (err) {
      console.error('Failed to create connection:', err);
      toast.error(err.response?.data?.error || 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  const getConnectionTypeLabel = (typeSlug) => {
    return connectionTypes.find(ct => ct.type_slug === typeSlug)?.label || typeSlug;
  };

  const getConnectionTypeDetails = (typeSlug) => {
    return connectionTypes.find(ct => ct.type_slug === typeSlug);
  };

  const getServiceById = (serviceId) => {
    return services.find(s => s.id === serviceId);
  };

  // Group services by CMDB item
  const getGroupedServices = () => {
    const grouped = {};
    services.forEach(s => {
      const key = s.cmdb_item_name || 'Unknown CMDB Item';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  };

  const getCmdbItemName = (serviceId) => {
    const service = getServiceById(serviceId);
    return service?.cmdb_item_name || 'Unknown';
  };

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Service-to-Service Connections</DialogTitle>
          <DialogDescription>
            Manage direct connections between services
            {cmdbItem ? <> in <strong>{cmdbItem.name}</strong></> : <> across all CMDB items</>}
            {currentService && <> • Current: <strong>{currentService.name}</strong></>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Create New Connection Form */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Buat Koneksi Service-to-Service</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {currentService
                  ? `Membuat koneksi dari ${currentService.name} ke service lain`
                  : 'Pilih source dan target service untuk membuat koneksi'
                }
              </p>
            </div>

            <div className="space-y-3">
              {/* Source Service */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Source Service</Label>
                <ServiceSelector
                  services={services}
                  value={selectedSourceService?.id}
                  onChange={(serviceId) => {
                    const service = services.find(s => s.id === serviceId);
                    setSelectedSourceService(service);
                  }}
                  placeholder="Select Source Service"
                  currentServiceId={currentService?.id}
                />
              </div>

              {/* Direction Arrow */}
              <div className="flex items-center justify-center py-1">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-full border shadow-sm">
                  <span className="text-xs font-medium text-muted-foreground">Connects To</span>
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
              </div>

              {/* Target Service */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Target Service</Label>
                <ServiceSelector
                  services={services}
                  value={selectedTargetService?.id}
                  onChange={(serviceId) => {
                    const service = services.find(s => s.id === serviceId);
                    setSelectedTargetService(service);
                  }}
                  placeholder="Select Target Service"
                  excludeIds={[selectedSourceService?.id].filter(Boolean)}
                  currentServiceId={currentService?.id}
                />
              </div>

              {/* Connection Type Selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Tipe Koneksi</Label>
                <ConnectionTypeSelector
                  value={connectionType}
                  onChange={setConnectionType}
                  connectionTypes={connectionTypes}
                  placeholder="Pilih tipe koneksi"
                />
              </div>

              {/* Preview */}
              {selectedSourceService && selectedTargetService && connectionType && (
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-center">
                      <div className="flex items-center gap-1 mb-1">
                        <Briefcase className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-medium">{selectedSourceService.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{selectedSourceService.cmdb_item_name}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2">
                      {(() => {
                        const typeDetails = getConnectionTypeDetails(connectionType);
                        if (!typeDetails) return <ArrowRight className="h-4 w-4 text-muted-foreground" />;

                        return (
                          <Badge
                            className="text-white"
                            style={{ backgroundColor: typeDetails.color }}
                          >
                            {typeDetails.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 mb-1">
                        <Briefcase className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-medium">{selectedTargetService.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{selectedTargetService.cmdb_item_name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreateConnection}
                  disabled={loading || !selectedSourceService || !selectedTargetService || !connectionType}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Connection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSourceService(currentService || null);
                    setSelectedTargetService(null);
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getConnectionTypeInfo, CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import {
  Server,
  Database,
  Network,
  Monitor,
  GitBranch,
  Shield,
  Wifi,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  Search,
  Check,
} from 'lucide-react';

export default function QuickConnectionModal({
  show,
  sourceItem,
  targetItem,
  onClose,
  onSave,
  mode = 'create', // 'create' or 'edit'
  existingConnectionType = null,
}) {
  const [selectedType, setSelectedType] = useState('depends_on');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (show) {
      setSelectedType(existingConnectionType || 'depends_on');
      setSearchQuery('');
    }
  }, [show, existingConnectionType]);

  if (!sourceItem || !targetItem) return null;

  const getItemIcon = (type) => {
    const iconProps = { size: 32, className: 'text-foreground' };

    switch (type) {
      case 'server': return <Server {...iconProps} />;
      case 'database': return <Database {...iconProps} />;
      case 'switch': return <Network {...iconProps} />;
      case 'workstation': return <Monitor {...iconProps} />;
      case 'hub': return <GitBranch {...iconProps} />;
      case 'firewall': return <Shield {...iconProps} />;
      case 'router': return <Wifi {...iconProps} />;
      default: return <Server {...iconProps} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500 border-green-600';
      case 'inactive': return 'bg-red-500 border-red-600';
      case 'maintenance': return 'bg-yellow-500 border-yellow-600';
      case 'decommissioned': return 'bg-gray-500 border-gray-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const connectionTypeInfo = getConnectionTypeInfo(selectedType);

  const getArrowIcon = () => {
    switch (connectionTypeInfo.default_direction) {
      case 'forward':
        return <ArrowRight size={28} style={{ color: connectionTypeInfo.color }} />;
      case 'backward':
        return <ArrowLeft size={28} style={{ color: connectionTypeInfo.color }} />;
      case 'bidirectional':
        return <ArrowRightLeft size={28} style={{ color: connectionTypeInfo.color }} />;
      default:
        return <ArrowRight size={28} style={{ color: connectionTypeInfo.color }} />;
    }
  };

  const handleSave = () => {
    onSave(selectedType);
  };

  // Filter connection types based on search query
  const filteredConnectionTypes = Object.entries(CONNECTION_TYPES).filter(([key, type]) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      type.label.toLowerCase().includes(searchLower) ||
      key.toLowerCase().includes(searchLower) ||
      (type.description && type.description.toLowerCase().includes(searchLower))
    );
  });

  return (
    <>
      <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Tipe Koneksi' : 'Buat Koneksi Baru'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visual Connection Preview */}
          <div className="bg-muted rounded-lg p-6">
            <div className="text-center text-sm text-muted-foreground mb-4 font-medium">
              VISUALISASI KONEKSI
            </div>

            <div className="flex items-center justify-center gap-4">
              {/* Source Item */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${getStatusColor(sourceItem.status)}`}>
                  {getItemIcon(sourceItem.type)}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{sourceItem.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{sourceItem.type}</div>
                </div>
              </div>

              {/* Connection Arrow */}
              <div className="flex flex-col items-center gap-2 px-4">
                <div className="rounded-full p-2 bg-background border-2 shadow-md">
                  {getArrowIcon()}
                </div>
                <div
                  className="text-xs font-semibold px-2 py-1 rounded text-white"
                  style={{ backgroundColor: connectionTypeInfo.color }}
                >
                  {connectionTypeInfo.label}
                </div>
              </div>

              {/* Target Item */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${getStatusColor(targetItem.status)}`}>
                  {getItemIcon(targetItem.type)}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{targetItem.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{targetItem.type}</div>
                </div>
              </div>
            </div>

            {/* Description based on arrow direction */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {connectionTypeInfo.default_direction === 'forward' && (
                <span>
                  <strong>{sourceItem.name}</strong> {connectionTypeInfo.label.toLowerCase()} <strong>{targetItem.name}</strong>
                </span>
              )}
              {connectionTypeInfo.default_direction === 'backward' && (
                <span>
                  <strong>{targetItem.name}</strong> {connectionTypeInfo.label.toLowerCase()} <strong>{sourceItem.name}</strong>
                </span>
              )}
              {connectionTypeInfo.default_direction === 'bidirectional' && (
                <span>
                  <strong>{sourceItem.name}</strong> dan <strong>{targetItem.name}</strong> memiliki hubungan {connectionTypeInfo.label.toLowerCase()}
                </span>
              )}
            </div>
          </div>

          {/* Connection Type Selector with Search */}
          <div className="space-y-3">
            <Label htmlFor="connection-type" className="text-base font-semibold">
              Pilih Tipe Koneksi
            </Label>

            <Button
              variant="outline"
              className="w-full justify-between"
              id="connection-type"
              onClick={() => setShowTypeSelector(true)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: connectionTypeInfo.color }}
                />
                <span>{connectionTypeInfo.label}</span>
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {connectionTypeInfo.default_direction === 'forward' ? '→' : connectionTypeInfo.default_direction === 'backward' ? '←' : '↔'}
              </span>
            </Button>

            {/* Connection Type Description */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
              <p className="text-sm">
                <span className="font-semibold">Definisi: </span>
                {getConnectionTypeInfo(selectedType).description || getConnectionTypeInfo(selectedType).label}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            {mode === 'edit' ? 'Simpan Perubahan' : 'Buat Koneksi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Separate Dialog for Connection Type Selection */}
    <Dialog open={showTypeSelector} onOpenChange={setShowTypeSelector}>
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
          <CommandList style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tidak ada tipe koneksi ditemukan
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredConnectionTypes.map(([key, type]) => (
                <CommandItem
                  key={key}
                  value={key}
                  onSelect={() => {
                    setSelectedType(key);
                    setShowTypeSelector(false);
                    setSearchQuery('');
                  }}
                  className="cursor-pointer"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mr-3"
                    style={{ backgroundColor: type.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{type.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({type.default_direction === 'forward' ? '→' : type.default_direction === 'backward' ? '←' : '↔'})
                      </span>
                    </div>
                    {type.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {type.description}
                      </p>
                    )}
                  </div>
                  {selectedType === key && (
                    <Check size={14} className="text-primary ml-auto" />
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

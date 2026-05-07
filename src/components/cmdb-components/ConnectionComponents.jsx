import { useState } from 'react';
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/command";
import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Link2,
  Layers,
  Shield,
  TrendingUp,
  RefreshCw,
  Server,
  Key,
  Puzzle,
  ArrowUp,
  ArrowDown,
  Lock,
  ShieldCheck,
  Eye,
  Scale,
  Zap,
  Database,
  Workflow,
  Route,
  Check,
} from 'lucide-react';

// Helper function to get icon for connection type
export function getConnectionIcon(iconName) {
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

/**
 * ConnectionTypeSelector - Reusable connection type selector with search
 * Supports both database connection types (with icon) and CONNECTION_TYPES (with color/propagation)
 */
export function ConnectionTypeSelector({
  value,
  onChange,
  connectionTypes = null, // Array from database or null to use CONNECTION_TYPES
  CONNECTION_TYPES = null, // Object from flowHelpers
  placeholder = "Pilih tipe koneksi",
  size = "default",
  className = "",
  showDescription = true,
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which data source to use
  const useDatabaseTypes = connectionTypes !== null && Array.isArray(connectionTypes);

  let selectedType = null;
  if (useDatabaseTypes) {
    selectedType = connectionTypes.find(ct => ct.type_slug === value);
  } else if (CONNECTION_TYPES) {
    selectedType = CONNECTION_TYPES[value] || CONNECTION_TYPES.depends_on;
  }

  const filteredTypes = useDatabaseTypes
    ? connectionTypes.filter(ct => {
        const searchLower = searchQuery.toLowerCase();
        return (
          ct.label.toLowerCase().includes(searchLower) ||
          ct.type_slug.toLowerCase().includes(searchLower) ||
          (ct.description && ct.description.toLowerCase().includes(searchLower))
        );
      })
    : CONNECTION_TYPES
    ? Object.entries(CONNECTION_TYPES).filter(([key, type]) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          type.label.toLowerCase().includes(searchLower) ||
          key.toLowerCase().includes(searchLower) ||
          (type.description && type.description.toLowerCase().includes(searchLower))
        );
      })
    : [];

  const sizeClasses = size === "small" ? "h-7 text-xs" : "";

  const getDisplayColor = () => {
    if (useDatabaseTypes && selectedType) {
      return selectedType.color;
    } else if (selectedType) {
      return selectedType.color;
    }
    return '#6b7280';
  };

  const getDisplayLabel = () => {
    if (useDatabaseTypes && selectedType) {
      return selectedType.label;
    } else if (selectedType) {
      return selectedType.label;
    }
    return placeholder;
  };

  const getArrowIndicator = () => {
    if (useDatabaseTypes && selectedType) {
      switch (selectedType.default_direction) {
        case 'backward': return '←';
        case 'bidirectional': return '↔';
        default: return '→';
      }
    } else if (selectedType) {
      return selectedType.propagation === 'both' ? '↔' : '→';
    }
    return '→';
  };

  const getDescription = () => {
    if (useDatabaseTypes && selectedType) {
      return selectedType.description;
    } else if (selectedType) {
      return selectedType.description;
    }
    return '';
  };

  return (
    <>
      <Button
        variant="outline"
        className={`w-full justify-between ${sizeClasses} ${className}`}
        onClick={() => setShowDialog(true)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: getDisplayColor() }}
          />
          <span className="truncate">{getDisplayLabel()}</span>
        </div>
        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
          {getArrowIndicator()}
        </span>
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
                {useDatabaseTypes
                  ? filteredTypes.map((ct) => (
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
                        {ct.description && showDescription && size !== "small" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {ct.description}
                          </p>
                        )}
                      </CommandItem>
                    ))
                  : CONNECTION_TYPES
                  ? filteredTypes.map(([key, type]) => (
                      <CommandItem
                        key={key}
                        value={key}
                        onSelect={() => {
                          onChange(key);
                          setShowDialog(false);
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
                              ({type.propagation === 'both' ? '↔' : '→'})
                            </span>
                          </div>
                          {type.description && showDescription && (
                            <p className="text-xs text-muted-foreground truncate">
                              {type.description}
                            </p>
                          )}
                        </div>
                        {value === key && (
                          <Check size={14} className="text-primary ml-auto" />
                        )}
                      </CommandItem>
                    ))
                  : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * ConnectionVisualization - Visual connection preview showing source -> connection -> target
 */
export function ConnectionVisualization({
  sourceItem,
  targetItem,
  connectionType,
  getItemIcon,
  getItemTypeLabel,
  getItemData,
  isGroup,
  getDisplayColor,
}) {
  const getArrowIcon = () => {
    const color = connectionType?.color || '#6b7280';
    const propagation = connectionType?.propagation || connectionType?.default_direction;

    if (propagation === 'both' || propagation === 'bidirectional') {
      return <ArrowRightLeft size={28} style={{ color }} />;
    }
    return <ArrowRight size={28} style={{ color }} />;
  };

  const getPropagationLabel = () => {
    if (!connectionType) return '→';

    const propagation = connectionType.propagation || connectionType.default_direction;
    if (propagation === 'both' || propagation === 'bidirectional') return '↔';
    if (propagation === 'target_to_source' || propagation === 'backward') return '←';
    return '→';
  };

  const sourceData = getItemData ? getItemData(sourceItem) : sourceItem;
  const targetData = getItemData ? getItemData(targetItem) : targetItem;
  const sourceIsGroup = isGroup ? isGroup(sourceItem) : false;
  const targetIsGroup = isGroup ? isGroup(targetItem) : false;

  return (
    <div className="bg-muted rounded-lg p-6">
      <div className="text-center text-sm text-muted-foreground mb-4 font-medium">
        VISUALISASI KONEKSI
      </div>

      <div className="flex items-center justify-center gap-4">
        {/* Source Item */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${
              sourceIsGroup ? '' : (getDisplayColor ? getDisplayColor(sourceItem) : '')
            }`}
            style={
              sourceIsGroup && sourceItem?.color
                ? {
                    borderColor: sourceItem.color,
                    backgroundColor: `${sourceItem.color}20`,
                  }
                : sourceIsGroup
                ? {}
                : {}
            }
          >
            {getItemIcon ? getItemIcon(sourceItem) : <Server size={32} />}
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm">{sourceData?.name || 'Source'}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {getItemTypeLabel ? getItemTypeLabel(sourceItem) : 'Item'}
            </div>
          </div>
        </div>

        {/* Connection Arrow */}
        <div className="flex flex-col items-center gap-2 px-4">
          <div className="rounded-full p-2 bg-background border-2 shadow-md">
            {getArrowIcon()}
          </div>
          {connectionType && (
            <div
              className="text-xs font-semibold px-2 py-1 rounded text-white"
              style={{ backgroundColor: connectionType.color || '#6b7280' }}
            >
              {connectionType.label || 'Koneksi'}
            </div>
          )}
        </div>

        {/* Target Item */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${
              targetIsGroup ? '' : (getDisplayColor ? getDisplayColor(targetItem) : '')
            }`}
            style={
              targetIsGroup && targetItem?.color
                ? {
                    borderColor: targetItem.color,
                    backgroundColor: `${targetItem.color}20`,
                  }
                : targetIsGroup
                ? {}
                : {}
            }
          >
            {getItemIcon ? getItemIcon(targetItem) : <Server size={32} />}
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm">{targetData?.name || 'Target'}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {getItemTypeLabel ? getItemTypeLabel(targetItem) : 'Item'}
            </div>
          </div>
        </div>
      </div>

      {/* Description based on propagation rule */}
      {connectionType && sourceData?.name && targetData?.name && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {connectionType.propagation === 'target_to_source' && (
            <span>
              <strong>{sourceData.name}</strong> {connectionType.label.toLowerCase()}{' '}
              <strong>{targetData.name}</strong>
            </span>
          )}
          {connectionType.propagation === 'source_to_target' && (
            <span>
              <strong>{sourceData.name}</strong> {connectionType.label.toLowerCase()}{' '}
              <strong>{targetData.name}</strong>
            </span>
          )}
          {connectionType.propagation === 'both' && (
            <span>
              <strong>{sourceData.name}</strong> dan <strong>{targetData.name}</strong> memiliki hubungan{' '}
              {connectionType.label.toLowerCase()}
            </span>
          )}
          {!connectionType.propagation && connectionType.default_direction !== 'backward' && (
            <span>
              <strong>{sourceData.name}</strong> {connectionType.label.toLowerCase()}{' '}
              <strong>{targetData.name}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ConnectionTypeWithDescription - Connection type selector with description box
 * Matches the style from QuickConnectionModal
 */
export function ConnectionTypeWithDescription({
  selectedType,
  connectionTypes = null,
  CONNECTION_TYPES = null,
  onTypeChange,
  label = "Pilih Tipe Koneksi",
}) {
  let typeInfo = null;

  if (connectionTypes && Array.isArray(connectionTypes)) {
    typeInfo = connectionTypes.find(ct => ct.type_slug === selectedType);
  } else if (CONNECTION_TYPES) {
    typeInfo = CONNECTION_TYPES[selectedType] || CONNECTION_TYPES.depends_on;
  }

  const description = typeInfo?.description || typeInfo?.label || '';

  return (
    <div className="space-y-3">
      <Label htmlFor="connection-type" className="text-base font-semibold">
        {label}
      </Label>

      <ConnectionTypeSelector
        value={selectedType}
        onChange={onTypeChange}
        connectionTypes={connectionTypes}
        CONNECTION_TYPES={CONNECTION_TYPES}
      />

      {/* Connection Type Description */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
        <p className="text-sm">
          <span className="font-semibold">Definisi: </span>
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * MiniConnectionPreview - Compact connection preview for list items
 */
export function MiniConnectionPreview({ connectionType, sourceName, targetName }) {
  const getArrowDirection = () => {
    if (connectionType?.propagation === 'target_to_source' || connectionType?.default_direction === 'backward') {
      return '←';
    }
    if (connectionType?.propagation === 'both' || connectionType?.default_direction === 'bidirectional') {
      return '↔';
    }
    return '→';
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="max-w-16 truncate" title={sourceName}>{sourceName}</span>
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded text-white font-medium"
        style={{ backgroundColor: connectionType?.color || '#6b7280' }}
        title={connectionType?.label || 'Connection'}
      >
        {getArrowDirection()}
      </div>
      <span className="max-w-16 truncate" title={targetName}>{targetName}</span>
    </div>
  );
}

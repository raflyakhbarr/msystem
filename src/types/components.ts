export interface DataItem {
    [key: string]: unknown;
    id?: string | number;
  }

  export interface Column<T extends DataItem = DataItem> {
    key: string;
    label: string;
    searchable?: boolean;
    sortable?: boolean;
    exportable?: boolean;
    isBoolean?: boolean;
    isDate?: boolean;
    isEnum?: boolean;
    enumOptions?: Array<{ value: string; label: string; color?: string }>;
    nested?: boolean;
    badgelabel?: string;
    render?: (item: T) => React.ReactNode;
  }

  export interface ActionButton {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    className?: string;
  }

  export interface DataTableProps<T extends DataItem = DataItem> {
    data: T[];
    columns: Column<T>[];
    title?: string;
    loading?: boolean;
    error?: string | null;
    onRefresh?: () => void;
    onAdd?: () => void;
    onExport?: (data: T[]) => unknown;
    itemsPerPage?: number;
    showAddButton?: boolean;
    showExportButton?: boolean;
    showRefreshButton?: boolean;
    refreshing?: boolean;
    actionButtons?: ActionButton[];
    maxHeight?: string;
  }

  export interface ComboBoxOption {
    value: string | number;
    label: string;
    [key: string]: unknown;
  }

  export interface ComboBoxProps {
    options: ComboBoxOption[];
    value?: string | number;
    onValueChange?: (value: string | number) => void;
    placeholder?: string;
    className?: string;
    loading?: boolean;
    disabled?: boolean;
    searchable?: boolean;
  }
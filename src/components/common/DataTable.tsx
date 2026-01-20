import React, { useState } from 'react';
import { Download, RefreshCw, Plus, MoveUp, MoveDown, MoveVertical, Ban, CheckCircleIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface Column {
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
  colorlabel?: string
  render?: (item: unknown) => React.ReactNode;
}

export interface DataItem {
  [key: string]: unknown;
  id?: string | number;
}

interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface DataTableProps {
  data: DataItem[];
  columns: Column[];
  title?: string;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onAdd?: () => void;
  onExport?: (data: DataItem[]) => unknown;
  itemsPerPage?: number;
  showAddButton?: boolean;
  showExportButton?: boolean;
  showRefreshButton?: boolean;
  refreshing?: boolean;
  actionButtons?: ActionButton[];
  maxHeight?: string;
}

const DataTable = ({
  data,
  columns,
  title,
  loading,
  error,
  onRefresh,
  onAdd,
  onExport,
  itemsPerPage = 10,
  showAddButton = true,
  showExportButton = true,
  showRefreshButton = true,
  refreshing = false,
  actionButtons = [],
  maxHeight
}: DataTableProps) => {
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  React.useEffect(() => {
    const initialSearchTerms: Record<string, string> = {};
    columns.forEach(column => {
      if (column.searchable !== false) {
        initialSearchTerms[column.key] = '';
      }
    });
    setSearchTerms(initialSearchTerms);
  }, [columns]);

  const handleSortClick = (field: string) => {
    if (sortOrder === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortOrder(null);
        setSortDirection(null);
      } else {
        setSortOrder(field);
        setSortDirection('asc');
      }
    } else {
      setSortOrder(field);
      setSortDirection('asc');
    }
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const filteredData = data.filter((item: DataItem) => {
    return columns.every(column => {
      if (column.searchable === false) return true;
      const searchTerm = searchTerms[column.key] || '';
      if (searchTerm === '') return true;
      
      let itemValue = item[column.key];
      
      if (column.nested) {
        const keys = column.key.split('.');
        itemValue = keys.reduce((obj:unknown, key:string) => (obj as Record<string, unknown>)?.[key], item as unknown);
      }
      
      if (column.isDate && itemValue) {
        itemValue = new Date(itemValue as string | number | Date).toLocaleDateString();
      }
      
      if (column.isBoolean || typeof itemValue === 'boolean') {
        const boolValue = typeof itemValue === 'boolean' ? itemValue : itemValue === 'true' || itemValue === true;
        return boolValue.toString() === searchTerm;
      }
      
      if (column.isEnum) {
        if (searchTerm === 'null') {
          return itemValue === null || itemValue === undefined || itemValue === '';
        }
        const itemValueStr = itemValue != null ? itemValue.toString() : '';
        return searchTerm === '' || itemValueStr === searchTerm;
      }
      
      return (itemValue || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  const sortedData = React.useMemo(() => {
    if (!sortOrder || !sortDirection) {
      return [...filteredData];
    }
    
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      let aValue = a[sortOrder];
      let bValue = b[sortOrder];
      
      const column = columns.find(col => col.key === sortOrder);
      if (column?.nested) {
        const keys = sortOrder.split('.');
        aValue = keys.reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], a as unknown);
        bValue = keys.reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], b as unknown);
      }
      
      if (column?.isDate) {
        const dateA = new Date(aValue as string |number |Date || 0);
        const dateB = new Date(bValue as string |number |Date || 0);
        comparison = dateA.getTime() - dateB.getTime();
      } else {
        const strA = (aValue || '').toString();
        const strB = (bValue || '').toString();
        comparison = strA.localeCompare(strB);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortOrder, sortDirection, columns]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const exportToExcel = async () => {
    try {
      // Dynamically import xlsx only when needed
      const XLSX = await import('xlsx');

      let exportData:unknown;

      if (onExport) {
        exportData = onExport(sortedData);
      } else {
        exportData = sortedData.map((item: DataItem) => {
          const exportItem: Record<string, unknown> = {};
          columns.forEach(column => {
            if (column.exportable !== false) {
              let value = item[column.key];

              if (column.nested) {
                const keys = column.key.split('.');
                value = keys.reduce((obj: unknown, key) => (obj as Record<string, unknown>)?.[key], item);
              }

              if (typeof value === 'boolean') {
                value = value ? 'Yes' : 'No';
              }

              if (column.isDate && value) {
                value = new Date(value as string |number |Date).toLocaleDateString();
              }

              exportItem[column.label] = value || '';
            }
          });
          return exportItem;
        });
      }

      if (exportData && Array.isArray(exportData) && exportData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title || "Data");

        const today = new Date().toLocaleDateString().replace(/\//g, '-');
        const fileName = `${(title || '').toLowerCase().replace(/\s+/g, '_')}_data_${today}.xlsx`;

        XLSX.writeFile(wb, fileName);
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      try {
        // Dynamically import xlsx in fallback as well
        const XLSX = await import('xlsx');

        const simpleData = sortedData.map((item: DataItem) => {
          const exportItem: Record<string, unknown> = {};
          columns.forEach(column => {
            if (column.exportable !== false) {
              exportItem[column.label] = item[column.key] || '';
            }
          });
          return exportItem;
        });

        const ws = XLSX.utils.json_to_sheet(simpleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title || "Data");

        const fileName = `${(title || 'data')}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (fallbackError) {
        console.error('Fallback export also failed:', fallbackError);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-4">
        {/* Header Skeleton */}
        <div className="shrink-0">
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="flex-1 min-h-0 bg-card rounded-xl shadow-lg flex flex-col overflow-hidden border border-border/50">
          <div className="overflow-y-auto">
            <Table>
              <TableHeader className="bg-card-dark sticky top-0 z-10 border-b border-border shadow-sm">
                <TableRow>
                  {columns.map((_column, index) => (
                    <TableHead key={index} className="px-6 py-3 text-left">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-full" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {Array.from({ length: itemsPerPage }).map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((_column, colIndex) => (
                      <TableCell key={colIndex} className="px-6 py-4">
                        <Skeleton className="h-4 w-full max-w-50" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Skeleton */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-card shrink-0">
            <Skeleton className="h-4 w-48" />
            <div className="space-x-2">
              <Skeleton className="h-8 w-20 rounded-md inline-block" />
              <Skeleton className="h-8 w-10 rounded-md inline-block" />
              <Skeleton className="h-8 w-10 rounded-md inline-block" />
              <Skeleton className="h-8 w-10 rounded-md inline-block" />
              <Skeleton className="h-8 w-10 rounded-md inline-block" />
              <Skeleton className="h-8 w-20 rounded-md inline-block" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header Section */}      
      <div className="shrink-0">
        <h2 className="text-xl font-bold text-foreground mb-4">{title || 'Data'} ({data.length} Total)</h2>
        <div className="flex items-center gap-4">
          <ButtonGroup>
            {actionButtons && actionButtons.length > 0 && actionButtons.map((btn, index) => (
              <Button
                key={index}
                variant="secondary"
                size="default"
                onClick={btn.onClick}
                className={btn.className}
              >
                {btn.icon}
                {btn.label}
              </Button>
            ))}
            {showAddButton && onAdd && (
              <Button variant="default" size="default" onClick={onAdd} className='bg-primary text-background'>
                Add
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </ButtonGroup>
          <ButtonGroup>
            {showExportButton && (
              <Button
                variant="outline"
                size="default"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  exportToExcel();
                }}
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <ButtonGroupSeparator />
            {showRefreshButton && onRefresh && (
              <Button
                variant="outline"
                size="default"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </ButtonGroup>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-card rounded-xl shadow-lg flex flex-col overflow-hidden border border-border/50">
        
        <div className={`flex-1 overflow-y-auto relative ${maxHeight || ''}`}>
          <Table>
            <TableHeader className="bg-card-dark sticky top-0 z-10 border-b border-border shadow-sm">
              <TableRow>
                {columns.map(column => (
                  <TableHead key={column.key} className="px-6 py-3 text-left text-xs font-medium text-card-foreground uppercase tracking-wider bg-card-dark">
                    {column.searchable !== false ? (
                      <div className="flex flex-col space-y-2">
                        <div
                          className="flex items-center cursor-pointer hover:bg-muted p-1 rounded"
                          onClick={() => column.sortable !== false && handleSortClick(column.key)}
                        >
                          {column.label}
                          <span className="ml-1 text-muted-foreground">
                            {sortOrder === column.key ? (
                              sortDirection === 'asc' ? <MoveUp className="h-3 w-3 text-primary" /> : <MoveDown className="h-3 w-3 text-primary" />
                            ) : (
                              <MoveVertical className="h-3 w-3" />
                            )}
                          </span>
                        </div>
                        {column.isEnum ? (
                          <select
                            value={searchTerms[column.key] || ''}
                            onChange={(e) => handleSearchChange(column.key, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring font-normal bg-background"
                          >
                            <option value="">All</option>
                            {column.enumOptions?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : column.isBoolean ? (
                          <select
                            value={searchTerms[column.key] || ''}
                            onChange={(e) => handleSearchChange(column.key, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring font-normal bg-background"
                          >
                            <option value="">All</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={`Search...`}
                            value={searchTerms[column.key] || ''}
                            onChange={(e) => handleSearchChange(column.key, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring font-normal bg-background"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {column.label}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {currentItems.map((item, index) => (
                <TableRow key={item.id || index} className="hover:bg-muted/50 transition-colors">
                  {columns.map(column => (
                    <TableCell key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {column.render ? column.render(item) : (
                        <>
                          {column.isEnum ? (
                            (() => {
                              const option = column.enumOptions?.find(opt => opt.value === item[column.key]);
                              return (
                                <span className={`px-2 py-1 rounded text-xs ${option?.color || 'bg-gray-100 text-gray-800'}`}>
                                  {option?.label || item[column.key] as string}
                                </span>
                              );
                            })()
                          ) : column.isBoolean ? (
                              <div className="flex items-center">
                                {(() => {
                                  const value = item[column.key] === true;
                                  const parts = (column.badgelabel || 'Active : Inactive').split(':').map(s => s.trim());
                                  const labelText = value ? parts[0] : parts[1] || parts[0];
                                  if (value) {
                                    return (
                                      <Badge
                                        variant='outline'
                                        className='rounded-sm border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 [a&]:hover:bg-green-600/10 [a&]:hover:text-green-600/90 dark:[a&]:hover:bg-green-400/10 dark:[a&]:hover:text-green-400/90'
                                      >
                                        <CheckCircleIcon className='size-3' />
                                        {labelText}
                                      </Badge>
                                    );
                                  } else {
                                    return (
                                      <Badge
                                        variant="outline"
                                        className="text-destructive [a&]:hover:bg-destructive/10 [a&]:hover:text-destructive/90 border-destructive rounded-sm"     
                                      >
                                        <Ban className="size-3" />
                                        {labelText}
                                      </Badge>
                                    );
                                  }
                                })()}
                              </div>
                          ) : column.isDate ? (
                            new Date(item[column.key] as string | number | Date).toLocaleDateString()
                          ) : column.nested ? (
                            (() => {
                              const keys = column.key.split('.');
                              return keys.reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], item as unknown) || '';
                            })()
                          ) : (
                            item[column.key] || ''
                          )}
                        </>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {currentItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-card shrink-0 z-20">
          <span className="text-sm text-foreground">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedData.length)} of {sortedData.length} results
          </span>
          <div className="space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md text-sm ${currentPage === 1 ? 'bg-muted text-muted-foreground/50 cursor-not-allowed' : 'bg-background border border-border hover:bg-muted'}`}
            >
              Previous
            </button>
              
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1
              if (totalPages > 5 && currentPage > 3) pageNum = currentPage - 2 + i
              if (pageNum > totalPages) return null
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-md text-sm ${currentPage === pageNum ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:bg-muted'}`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded-md text-sm ${currentPage === totalPages || totalPages === 0 ? 'bg-muted text-muted-foreground/50 cursor-not-allowed' : 'bg-background border border-border hover:bg-muted'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
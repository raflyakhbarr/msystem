import React from 'react';
import { ComboBox, type ComboBoxOption } from '@/components/common/ComboBox';
import { useApiData } from '@/hooks/useApiData';
import { fetchMenuGroupSelect } from '@/api/menugroupApi';

interface MenuGroupComboBoxProps {
  value?: number;
  onValueChange?: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MenuGroupComboBox({ 
  value, 
  onValueChange, 
  placeholder = "Select menu group...",
  className,
  disabled = false
}: MenuGroupComboBoxProps) {
  const { data: menuGroups, loading, error, refetch } = useApiData(fetchMenuGroupSelect);

  // Transform menu groups to ComboBox options
  const options: ComboBoxOption[] = React.useMemo(() => {
    const opts = menuGroups.map(menuGroup => ({
      value: menuGroup.value,
      label: menuGroup.label,
    }));
    return opts.filter(opt => opt.value !== undefined && opt.value !== null);
  }, [menuGroups]);

  if (error) {
    return (
      <div className="w-[200px]">
        <button 
          className="w-full p-2 border border-red-300 bg-red-50 text-red-700 rounded text-sm"
          onClick={refetch}
          disabled={loading}
        >
          {loading ? 'Retrying...' : 'Failed to load menu groups (click to retry)'}
        </button>
      </div>
    );
  }

  // Ensure value type matches options (API returns strings)
  const normalizedValue = value !== undefined ? String(value) : undefined;

  return (
    <ComboBox
      options={options}
      value={normalizedValue}
      onValueChange={(val) => onValueChange && onValueChange(Number(val))}
      placeholder={placeholder}
      className={className}
      loading={loading}
      disabled={disabled}
      searchable={true}
    />
  );
}

export default MenuGroupComboBox;

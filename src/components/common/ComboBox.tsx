"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboBoxOption {
  value: string | number;
  label: string;
  [key: string]: any; // Allow additional properties
}

interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string | number;
  onValueChange?: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  searchable?: boolean;
}

export function ComboBox({ 
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  className,
  loading = false,
  disabled = false,
  searchable = true
}: ComboBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm, searchable])

  const selectedOption = React.useMemo(() =>
    // Only find an option if value is not empty/null/undefined
    value && options.find((option) => option.value === value),
    [options, value]
  )

  const handleSelect = React.useCallback((selectedValue: string) => {
    const option = options.find(opt =>
      String(opt.value) === selectedValue || opt.label === selectedValue
    );

    if (option && onValueChange) {
      onValueChange(option.value)
    }
    setOpen(false)
  }, [options, onValueChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || loading}
        >
          {loading ? (
            "Loading..."
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            placeholder
          )}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
          className="p-0 z-[10002]" 
          align="start"
          sideOffset={4}
          style={{ width: 'var(--radix-popover-trigger-width)' }} 
        >
        <Command>
          {searchable && (
            <CommandInput 
              placeholder="Search..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
          )}
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={handleSelect}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
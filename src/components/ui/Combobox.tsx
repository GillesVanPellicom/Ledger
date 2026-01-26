import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Check, Search, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import Input from './Input';
import Divider from './Divider';
import Tooltip from './Tooltip';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  showSearch?: boolean;
  variant?: 'default' | 'add';
  onAdd?: () => void;
  addTooltip?: string;
}

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 6;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  noResultsText = "No results found.",
  className,
  disabled = false,
  label,
  error,
  showSearch = true,
  variant = 'default',
  onAdd,
  addTooltip = "Add new",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [scrollTop, setScrollTop] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const fuzzySearch = (term: string, text: string) => {
    const search = term.replace(/[\s()]/g, '').toLowerCase();
    const content = text.replace(/[\s()]/g, '').toLowerCase();
    let searchIndex = 0;
    for (let i = 0; i < content.length; i++) {
      if (searchIndex < search.length && content[i] === search[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === search.length;
  };

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) => fuzzySearch(searchTerm, option.label));
  }, [searchTerm, options]);

  // Virtualization logic
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
  const endIndex = Math.min(filteredOptions.length, startIndex + VISIBLE_ITEMS + 4);
  const visibleOptions = filteredOptions.slice(startIndex, endIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleSelectOption = useCallback((selectedValue: string) => {
    const option = options.find(o => o.value === selectedValue);
    if (option?.disabled) return;

    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  }, [onChange, options]);

  const calculatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 4}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (isOpen) {
      const index = filteredOptions.findIndex(opt => opt.value === value);
      setActiveIndex(index >= 0 ? index : 0);
      
      if (showSearch) {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
      
      // Reset scroll on open
      if (listRef.current) {
        listRef.current.scrollTop = index >= 0 ? Math.max(0, (index - 2) * ITEM_HEIGHT) : 0;
        setScrollTop(listRef.current.scrollTop);
      }
    } else {
      setSearchTerm('');
      setScrollTop(0);
    }
  }, [isOpen, value, filteredOptions, showSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && filteredOptions[activeIndex]) {
            const option = filteredOptions[activeIndex];
            if (!option.disabled) {
              handleSelectOption(option.value);
            }
          }
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeIndex, filteredOptions, handleSelectOption]);

  // Sync scroll with active index
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const targetScroll = activeIndex * ITEM_HEIGHT;
      const currentScroll = listRef.current.scrollTop;
      
      if (targetScroll < currentScroll) {
        listRef.current.scrollTop = targetScroll;
      } else if (targetScroll + ITEM_HEIGHT > currentScroll + LIST_HEIGHT) {
        listRef.current.scrollTop = targetScroll - LIST_HEIGHT + ITEM_HEIGHT;
      }
    }
  }, [activeIndex, isOpen]);
  
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
    }
  }, [searchTerm, isOpen]);

  const PopoverContent = (
    <div 
      ref={popoverRef}
      style={popoverStyle}
      className="rounded-xl bg-field shadow-xl border border-border outline-none animate-in fade-in-0 zoom-in-95 flex flex-col"
    >
      {showSearch && (
        <>
          <div className="p-2 relative shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-font-2" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-8"
              autoComplete="off"
            />
          </div>
          <Divider className="shrink-0" />
        </>
      )}
      <div 
        ref={listRef} 
        onScroll={handleScroll}
        className="overflow-auto p-1 relative"
        style={{ height: `${Math.min(LIST_HEIGHT, filteredOptions.length * ITEM_HEIGHT)}px` }}
      >
        <div style={{ height: `${filteredOptions.length * ITEM_HEIGHT}px`, position: 'relative' }}>
          {visibleOptions.length > 0 ? (
            visibleOptions.map((option, index) => {
              const actualIndex = startIndex + index;
              const isActive = actualIndex === activeIndex;
              const isSelected = value === option.value;
              
              const optionContent = (
                <div
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  data-active={isActive}
                  className={cn(
                    "absolute left-0 right-0 flex cursor-pointer select-none items-center rounded-md px-2 pl-8 text-sm outline-none transition-colors text-font-1",
                    isActive && !option.disabled ? "bg-field-hover" : "",
                    option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-field-hover"
                  )}
                  style={{ 
                    top: `${actualIndex * ITEM_HEIGHT}px`, 
                    height: `${ITEM_HEIGHT}px` 
                  }}
                  onClick={() => !option.disabled && handleSelectOption(option.value)}
                  onMouseEnter={() => setActiveIndex(actualIndex)}
                >
                  {isSelected && (
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4 text-accent" />
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
              );

              if (option.disabled && option.tooltip) {
                return (
                  <Tooltip key={option.value} content={option.tooltip} className="w-full block">
                    {optionContent}
                  </Tooltip>
                );
              }

              return (
                <React.Fragment key={option.value}>
                  {optionContent}
                </React.Fragment>
              );
            })
          ) : (
            <div className="py-6 text-center text-sm text-font-2">
              {noResultsText}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-font-1 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-stretch">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between border border-border bg-field px-3 py-2 text-sm text-font-1 placeholder:text-font-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all",
            variant === 'default' ? "rounded-lg" : "rounded-l-lg border-r-0",
            disabled ? "bg-field-disabled cursor-not-allowed opacity-50" : "hover:bg-field-hover",
            error && "border-danger focus:ring-danger"
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
        {variant === 'add' && (
          <button
            type="button"
            onClick={onAdd}
            title={addTooltip}
            className="flex items-center justify-center w-10 h-10 border border-border border-l bg-field hover:bg-field-hover text-font-2 hover:text-font-1 rounded-r-lg transition-all shrink-0"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
      {isOpen && createPortal(PopoverContent, document.body)}
    </div>
  );
};

export default Combobox;

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import Input from './Input';
import Divider from './Divider';

export interface ComboboxOption {
  value: string;
  label: string;
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
}

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

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
    return searchTerm
      ? options.filter((option) => fuzzySearch(searchTerm, option.label))
      : options;
  }, [searchTerm, options]);

  const handleSelectOption = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  }, [onChange]);

  const calculatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 4}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 9999, // Ensure it's on top
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
      // Reset active index when opening
      const index = options.findIndex(opt => opt.value === value);
      setActiveIndex(index >= 0 ? index : 0);
      
      // Focus input after a short delay to ensure rendering is complete
      // Using requestAnimationFrame for better timing than setTimeout
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setSearchTerm('');
    }
  }, [isOpen, value, options]);

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
            handleSelectOption(filteredOptions[activeIndex].value);
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

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);
  
  // Reset active index when search term changes
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
      <div ref={listRef} className="max-h-60 overflow-auto p-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => (
            <div
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              data-active={index === activeIndex}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none transition-colors text-font-1",
                "data-[active=true]:bg-field-hover",
                "hover:bg-field-hover"
              )}
              onClick={() => handleSelectOption(option.value)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {value === option.value && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check className="h-4 w-4 text-accent" />
                </span>
              )}
              <span className="truncate">{option.label}</span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-sm text-font-2">
            {noResultsText}
          </div>
        )}
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
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-field px-3 py-2 text-sm text-font-1 placeholder:text-font-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 hover:bg-field-hover transition-all", // Added hover:bg-field-hover
          error && "border-danger focus:ring-danger"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
      {isOpen && createPortal(PopoverContent, document.body)}
    </div>
  );
};

export default Combobox;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';
import Input from './Input';
import Separator from './Separator';

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
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

  const filteredOptions = searchTerm
    ? options.filter((option) => fuzzySearch(searchTerm, option.label))
    : options;

  const handleSelectOption = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  }, [onChange]);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(Math.max(0, filteredOptions.findIndex(opt => opt.value === value)));
      // Focus input after a short delay to allow the popover to render
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
    }
  }, [isOpen, value, filteredOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
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
  
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 shadow-md outline-none animate-in fade-in-0 zoom-in-95"
        >
          <div className="p-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9"
            />
          </div>
          <Separator className="my-0" />
          <div ref={listRef} className="max-h-60 overflow-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  data-active={index === activeIndex}
                  className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                    "data-[active=true]:bg-gray-100 dark:data-[active=true]:bg-gray-800",
                    "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => handleSelectOption(option.value)}
                >
                  {value === option.value && (
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-gray-500">
                {noResultsText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Combobox;

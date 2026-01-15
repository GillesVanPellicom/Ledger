import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
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
      <button
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-zinc-950 shadow-xl border border-gray-200 dark:border-zinc-800 outline-none animate-in fade-in-0 zoom-in-95"
        >
          <div className="p-2 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-8"
            />
          </div>
          <Separator className="border-gray-200 dark:border-zinc-800" />
          <div ref={listRef} className="max-h-60 overflow-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  data-active={index === activeIndex}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none",
                    "data-[active=true]:bg-gray-100 dark:data-[active=true]:bg-zinc-800",
                    "hover:bg-gray-100 dark:hover:bg-zinc-800"
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

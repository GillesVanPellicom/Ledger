import React, { useRef, useState, useLayoutEffect, useCallback, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { MinusIcon } from '@heroicons/react/24/solid';

interface DataGridProps<T> {
  data: T[];
  renderItem: (item: T) => ReactNode;
  onItemClick?: (item: T) => void;
  itemKey: keyof T;
  minItemWidth?: number;
  className?: string;
}

const DataGrid = <T extends { [key: string]: any }>({
  data,
  renderItem,
  onItemClick,
  itemKey,
  minItemWidth = 220,
  className,
}: DataGridProps<T>) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);

  const calculateGridParams = useCallback(() => {
    if (gridRef.current) {
      const containerWidth = gridRef.current.offsetWidth;
      const newCols = Math.max(1, Math.floor(containerWidth / minItemWidth));
      setCols(newCols);
    }
  }, [minItemWidth]);

  useLayoutEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    calculateGridParams();

    const resizeObserver = new ResizeObserver(() => {
      calculateGridParams();
    });

    resizeObserver.observe(gridEl);

    return () => {
      resizeObserver.unobserve(gridEl);
    };
  }, [calculateGridParams]);

  const numToRender = data.length > 0 ? Math.ceil(data.length / cols) * cols : cols;
  const items = Array.from({ length: numToRender }, (_, i) => data[i] || null);

  return (
    <div ref={gridRef} className={cn("rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden", className)}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {items.map((item, index) => (
          <div
            key={item ? item[itemKey] : `placeholder-${index}`}
            className={cn(
              "p-4",
              // Add top border to items not in the first row
              index >= cols && "border-t border-gray-200 dark:border-gray-800",
              // Add left border to items not in the first column
              index % cols !== 0 && "border-l border-gray-200 dark:border-gray-800",
              { "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50": !!item && !!onItemClick },
            )}
            onClick={() => item && onItemClick && onItemClick(item)}
          >
            {item ? (
              renderItem(item)
            ) : (
              <div className="h-full w-full flex items-center justify-center min-h-[120px]">
                <MinusIcon className="h-8 w-8 text-gray-300 dark:text-gray-700" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataGrid;

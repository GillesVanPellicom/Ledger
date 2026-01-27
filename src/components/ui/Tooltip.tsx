import React, { useState, useRef, useEffect, ReactNode, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, className, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const gap = 8;

    let top = triggerRect.top - tooltipRect.height - gap;
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

    // Check for top viewport collision and flip to bottom if needed
    if (top < 0) {
      top = triggerRect.bottom + gap;
    }

    // Check for left/right viewport collision
    if (left < 0) {
      left = gap;
    } else if (left + tooltipRect.width > viewport.width) {
      left = viewport.width - tooltipRect.width - gap;
    }

    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  return (
    <div 
      className={cn("inline-flex", className)} 
      onMouseEnter={() => setIsVisible(true)} 
      onMouseLeave={() => setIsVisible(false)}
      ref={triggerRef}
      {...props}
    >
      {children}
      {isVisible && content && createPortal(
        <div 
          ref={tooltipRef}
          className="fixed z-[9999] max-w-xs px-3 py-1.5 text-sm font-medium text-font-1 bg-bg-modal border border-border rounded-lg shadow-sm pointer-events-none"
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            // Initially render off-screen to measure
            visibility: coords.top === 0 ? 'hidden' : 'visible',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;

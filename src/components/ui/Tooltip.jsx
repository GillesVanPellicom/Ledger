import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

const Tooltip = ({ children, content, className, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8, // 8px gap above the element
        left: rect.left + rect.width / 2
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

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
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      ref={triggerRef}
      {...props}
    >
      {children}
      {isVisible && content && createPortal(
        <div 
          className="fixed z-[9999] max-w-xs px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-sm pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tooltip;

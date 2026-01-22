import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';
import { focusStack } from '../../utils/focusStack';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xlh' | 'full' | 'viewport';
  className?: string;
  onEnter?: () => void;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = 'md',
  className,
  onEnter
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalId = useRef(Math.random().toString(36).substr(2, 9));
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Blur it to prevent accidental interactions
      if (previousActiveElement.current) {
        previousActiveElement.current.blur();
      }

      setIsRendered(true);
      focusStack.push({ id: modalId.current, onEnter });
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      focusStack.remove(modalId.current);
      
      // Restore focus when closing, but only if this modal was the top one
      // (though in this effect, it's closing, so we just restore if we stored something)
      if (previousActiveElement.current) {
        // Optional: restore focus. Some UX patterns prefer this, others don't.
        // previousActiveElement.current.focus();
      }
    }
  }, [isOpen, onEnter]);

  useEffect(() => {
    if (!isRendered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle events if this modal is the top one in the stack
      if (!focusStack.isTop(modalId.current)) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && onEnter) {
        // Check if the active element is not a button or input that handles enter
        const target = document.activeElement as HTMLElement;
        const activeTag = target?.tagName.toLowerCase();
        
        // If nothing is focused (body) or a non-interactive element is focused, trigger onEnter
        // Also trigger if the focused element is NOT an input/textarea/button/select
        const isInteractiveInput = 
          activeTag === 'input' || 
          activeTag === 'textarea' || 
          activeTag === 'select' || 
          activeTag === 'button' || 
          target?.isContentEditable;

        if (!isInteractiveInput) {
           e.preventDefault();
           e.stopPropagation();
           onEnter();
        }
      }
    };
    
    // Use capture phase to ensure we catch it before other listeners if needed, 
    // but standard bubbling is usually fine. Let's stick to standard but ensure we stop propagation if handled.
    document.addEventListener('keydown', handleKeyDown);
    
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (!focusStack.getTop()) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isRendered, onClose, onEnter]);

  const handleTransitionEnd = () => {
    if (!isAnimating) {
      setIsRendered(false);
    }
  };

  if (!isRendered) return null;

  const sizes = {
    sm: 'max-w-md', 
    md: 'max-w-lg', 
    lg: 'max-w-2xl', 
    xl: 'max-w-4xl',
    xlh: 'max-w-4xl h-[80vh]',
    full: 'max-w-[95vw] h-[90vh]',
    viewport: 'max-w-[80vw] w-[80vw] h-[80vh] max-h-[80vh]',
  };

  return createPortal(
    <div id="modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300", isAnimating ? 'opacity-100' : 'opacity-0')}
        onClick={() => {
          if (focusStack.isTop(modalId.current)) {
            onClose();
          }
        }}
        aria-hidden="true"
      />
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          "relative w-full transform rounded-xl bg-bg-modal text-left shadow-xl transition-all duration-300 flex flex-col max-h-[90vh] border border-border",
          sizes[size],
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          className
        )}
        role="dialog"
        aria-modal="true"
        // Make the modal div focusable so we can shift focus to it
        tabIndex={-1}
        ref={(el) => {
          // Auto-focus the modal container when it mounts if nothing inside is auto-focused
          if (el && isAnimating && !el.contains(document.activeElement)) {
            el.focus();
          }
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-bg-2 rounded-t-xl">
          <h3 className="text-lg font-semibold text-font-1">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-field-hover transition-colors text-font-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex justify-end gap-3 shrink-0 bg-bg-2 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  secondaryText?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.", 
  confirmText = "Delete", 
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  secondaryText,
  onSecondaryAction,
  children
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    onEnter={onConfirm}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
        {secondaryText && onSecondaryAction && <Button variant="secondary" onClick={onSecondaryAction} disabled={loading}>{secondaryText}</Button>}
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </>
    }
  >
    {children ? children : <p className="text-font-2">{message}</p>}
  </Modal>
);

export default Modal;

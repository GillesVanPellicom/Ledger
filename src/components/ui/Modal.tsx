import React, { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';
import { focusStack } from '../../utils/focusStack';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xlh' | 'full' | 'viewport';
  className?: string;
  onEnter?: () => void | Promise<any>;
  // New props for the modular system
  showSuccessToast?: boolean;
  successToastMessage?: string;
  showErrorToast?: boolean;
  errorToastMessage?: string;
  isDatabaseTransaction?: boolean;
  loadingMessage?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = 'md',
  className,
  onEnter,
  showSuccessToast = true,
  successToastMessage = 'Operation successful',
  showErrorToast = true,
  errorToastMessage = 'An error occurred',
  isDatabaseTransaction = false,
  loadingMessage = 'Processing...',
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalId = useRef(nanoid(9));
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleEnterPress = useCallback(async () => {
    if (!onEnter) return;

    const result = onEnter();
    
    // Only trigger toasts if the result is a promise
    if (result instanceof Promise) {
      if (isDatabaseTransaction) {
        toast.promise(result, {
          loading: loadingMessage,
          success: successToastMessage,
          error: errorToastMessage,
        });
      } else {
        try {
          await result;
          if (showSuccessToast) toast.success(successToastMessage);
        } catch (e) {
          if (showErrorToast) toast.error(errorToastMessage);
        }
      }
      
      try {
        await result;
      } catch (e) {
        // Error handled by toast
      }
    }
  }, [onEnter, isDatabaseTransaction, loadingMessage, successToastMessage, errorToastMessage, showSuccessToast, showErrorToast]);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      setIsRendered(true);
      focusStack.push({ id: modalId.current, onEnter: handleEnterPress });
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      focusStack.remove(modalId.current);
    }
  }, [isOpen, handleEnterPress]);

  useEffect(() => {
    if (!isRendered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle events if this modal is the top one in the stack
      if (!focusStack.isTop(modalId.current)) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
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
           handleEnterPress();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (!focusStack.getTop()) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isRendered, onClose, handleEnterPress]);

  const handleTransitionEnd = () => {
    if (!isAnimating) {
      setIsRendered(false);
    }
  };

  const wrappedFooter = React.useMemo(() => {
    if (!footer) return null;
    
    const wrapClick = (child: React.ReactNode): React.ReactNode => {
      if (!React.isValidElement(child)) return child;
      
      if (child.type === React.Fragment) {
        return React.cloneElement(child, {}, React.Children.map(child.props.children, wrapClick));
      }
      
      if (child.props.onClick && child.props.children !== 'Cancel' && !child.props.disabled) {
         return React.cloneElement(child as React.ReactElement<any>, {
           onClick: (e: React.MouseEvent) => {
             e.preventDefault();
             e.stopPropagation();
             handleEnterPress();
           }
         });
      }
      
      return child;
    };

    return React.Children.map(footer, wrapClick);
  }, [footer, handleEnterPress]);

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
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-bg-modal rounded-t-xl">
          <h3 className="text-lg font-semibold text-font-1">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-field-hover transition-colors text-font-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="pl-6 pr-4 py-4 overflow-y-auto flex-1">{children}</div>
        {wrappedFooter && (
          <div className="px-6 py-4 flex justify-end gap-3 shrink-0 bg-bg-modal rounded-b-xl">
            {wrappedFooter}
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
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  secondaryText?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
  isDatabaseTransaction?: boolean;
  successToastMessage?: string;
  errorToastMessage?: string;
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
  children,
  isDatabaseTransaction = false,
  successToastMessage,
  errorToastMessage
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    onEnter={onConfirm}
    isDatabaseTransaction={isDatabaseTransaction}
    successToastMessage={successToastMessage}
    errorToastMessage={errorToastMessage}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
        {secondaryText && onSecondaryAction && <Button variant="secondary" onClick={onSecondaryAction} disabled={loading}>{secondaryText}</Button>}
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </>
    }
  >
    {children || <p className="text-font-2">{message}</p>}
  </Modal>
);

export default Modal;

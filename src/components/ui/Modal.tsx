import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Button from './Button';

// Global stack to track open modals
const modalStack: string[] = [];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = 'md',
  className 
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalId = useRef(Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      modalStack.push(modalId.current);
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Remove from stack immediately on close trigger
      const index = modalStack.indexOf(modalId.current);
      if (index > -1) {
        modalStack.splice(index, 1);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isRendered) return;

    const handleEscape = (e: KeyboardEvent) => {
      // Only close if this modal is the top one in the stack
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === modalId.current) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Only hide overflow if this is the first modal
    if (modalStack.length === 1) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Only restore overflow if no modals are left
      if (modalStack.length === 0) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isRendered, onClose]);

  const handleTransitionEnd = () => {
    if (!isAnimating) {
      setIsRendered(false);
    }
  };

  if (!isRendered) return null;

  const sizes = {
    sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[95vw] h-[90vh]',
  };

  return createPortal(
    <div id="modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300", isAnimating ? 'opacity-100' : 'opacity-0')}
        onClick={() => {
          // Only close on backdrop click if top of stack
          if (modalStack[modalStack.length - 1] === modalId.current) {
            onClose();
          }
        }}
        aria-hidden="true"
      />
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          "relative w-full transform rounded-xl bg-white dark:bg-zinc-950 text-left shadow-xl transition-all duration-300 flex flex-col max-h-[90vh] border border-gray-200 dark:border-zinc-800",
          sizes[size],
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-gray-50 dark:bg-zinc-950 rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-zinc-950 rounded-b-xl">
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
  onSecondaryAction
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
        {secondaryText && onSecondaryAction && <Button variant="secondary" onClick={onSecondaryAction} disabled={loading}>{secondaryText}</Button>}
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </>
    }
  >
    <p className="text-gray-600 dark:text-gray-300">{message}</p>
  </Modal>
);

export default Modal;

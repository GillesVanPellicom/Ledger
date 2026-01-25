import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { TriangleAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: Error | null;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Error"
      size='lg'
      onEnter={onClose}
      isDatabaseTransaction={false}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-red/20 rounded-full">
          <TriangleAlert className="h-8 w-8 text-red" />
        </div>
        
        <h3 className="text-lg font-medium text-font-1">
          An error occurred
        </h3>
        
        <p className="text-font-2">
          An error occurred with this function, please inform the developer.
        </p>

        {error && (
          <div className="w-full mt-4">
            <button
              onClick={toggleExpand}
              className="flex items-center justify-center w-full gap-2 text-sm text-font-2 hover:text-font-1 transition-colors"
            >
              <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 w-full text-left">
                <div className="p-4 bg-field-disabled rounded-lg overflow-x-auto">
                  <pre className="text-xs text-red font-mono whitespace-pre-wrap break-words">
                    {error.stack || error.message || String(error)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ErrorModal;

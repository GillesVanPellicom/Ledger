import React from 'react';
import Modal from './Modal';

interface ProgressModalProps {
  isOpen: boolean;
  progress: number;
  title?: string;
}

const ProgressModal: React.FC<ProgressModalProps> = ({ isOpen, progress, title = "Processing..." }) => {
  const displayProgress = Math.floor(progress);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={title} size="sm">
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        <div className="w-full bg-field-disabled rounded-full h-2.5">
          <div 
            className="bg-accent h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${displayProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-font-2">{displayProgress}% Complete</p>
      </div>
    </Modal>
  );
};

export default ProgressModal;

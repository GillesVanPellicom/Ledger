import React from 'react';
import Modal from './Modal';
import Spinner from './Spinner';

const ProgressModal = ({ isOpen, progress, title = "Processing..." }) => {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={title} size="sm">
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        <Spinner className="h-10 w-10 text-accent" />
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div 
            className="bg-accent h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">{progress}% Complete</p>
      </div>
    </Modal>
  );
};

export default ProgressModal;

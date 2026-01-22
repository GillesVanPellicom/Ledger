import React from 'react';
import Spinner from './Spinner';

const PageSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <Spinner className="w-12 h-12 text-accent" />
    </div>
  );
};

export default PageSpinner;

import React from 'react';
import Spinner from './Spinner';

const PageSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 dark:bg-zinc-950 dark:bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
      <Spinner className="w-12 h-12 text-blue-500" />
    </div>
  );
};

export default PageSpinner;

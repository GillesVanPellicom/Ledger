import React, { createContext, useState, useContext, useCallback } from 'react';
import ErrorModal from '../components/ui/ErrorModal';

const ErrorContext = createContext(null);

export const useError = () => useContext(ErrorContext);

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const showError = useCallback((err) => {
    console.error("Global error handler caught:", err);
    setError(err);
    setIsOpen(true);
  }, []);

  const closeError = () => {
    setIsOpen(false);
    setError(null);
  };

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <ErrorModal isOpen={isOpen} onClose={closeError} error={error} />
    </ErrorContext.Provider>
  );
};

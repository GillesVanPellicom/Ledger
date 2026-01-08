import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import ErrorModal from '../components/ui/ErrorModal';

interface ErrorContextType {
  showError: (err: Error) => void;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const showError = useCallback((err: Error) => {
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

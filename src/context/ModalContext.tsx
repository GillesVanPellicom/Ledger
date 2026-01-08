import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ModalContextType {
  registerModal: (id: string) => void;
  unregisterModal: (id: string) => void;
  isTopModal: (id: string) => boolean;
  stackDepth: number;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<string[]>([]);

  const registerModal = useCallback((id: string) => {
    setModals((prev) => [...prev, id]);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((modalId) => modalId !== id));
  }, []);

  const isTopModal = useCallback((id: string) => {
    return modals.length > 0 && modals[modals.length - 1] === id;
  }, [modals]);

  return (
    <ModalContext.Provider value={{ registerModal, unregisterModal, isTopModal, stackDepth: modals.length }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModalStack = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModalStack must be used within a ModalProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);

  const registerModal = useCallback((id) => {
    setModals((prev) => [...prev, id]);
  }, []);

  const unregisterModal = useCallback((id) => {
    setModals((prev) => prev.filter((modalId) => modalId !== id));
  }, []);

  const isTopModal = useCallback((id) => {
    return modals.length > 0 && modals[modals.length - 1] === id;
  }, [modals]);

  return (
    <ModalContext.Provider value={{ registerModal, unregisterModal, isTopModal, stackDepth: modals.length }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModalStack = () => useContext(ModalContext);

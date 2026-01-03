import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useDebugNavigate() {
  const navigate = useNavigate();

  const debugNavigate = useCallback((to, options) => {
    console.log(`[DebugNavigate] Navigating to:`, to, 'with options:', options);
    navigate(to, options);
  }, [navigate]);

  return debugNavigate;
}

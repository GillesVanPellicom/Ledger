import { useNavigate, NavigateOptions } from 'react-router-dom';
import { useCallback } from 'react';

export function useDebugNavigate() {
  const navigate = useNavigate();

  const debugNavigate = useCallback((to: string, options?: NavigateOptions) => {
    console.log(`[DebugNavigate] Navigating to:`, to, 'with options:', options);
    navigate(to, options);
  }, [navigate]);

  return debugNavigate;
}

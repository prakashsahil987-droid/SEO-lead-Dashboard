'use client';

import {createContext, useCallback, useContext, useMemo, useState} from 'react';

type Toast = {id: number; message: string; tone: 'success' | 'info'};
type ToastContextValue = {showToast: (message: string, tone?: Toast['tone']) => void};
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current, {id, message, tone}]);
    window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({showToast}), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{toasts.map(toast => <div className={`toast toast-${toast.tone}`} key={toast.id}>{toast.message}</div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

import { useState, useEffect } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Global toast state
let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener([...toasts]));
};

export const toast = {
  success: (message: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, message, type: 'success' }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 3000);
  },
  error: (message: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, message, type: 'error' }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  warning: (message: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, message, type: 'warning' }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  info: (message: string) => {
    const id = Date.now().toString();
    toasts = [...toasts, { id, message, type: 'info' }];
    notifyListeners();
    setTimeout(() => toast.dismiss(id), 3000);
  },
  dismiss: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  },
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return (
    <div className={styles.toastContainer}>
      {currentToasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span>{t.message}</span>
          <button className={styles.closeBtn} onClick={() => toast.dismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

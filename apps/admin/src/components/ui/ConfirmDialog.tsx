import { useState, useEffect } from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

let globalConfirmState: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  resolve: null,
};

let listeners: ((state: ConfirmState) => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener({ ...globalConfirmState }));
};

export const confirm = (options: ConfirmOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    globalConfirmState = {
      ...options,
      isOpen: true,
      resolve,
    };
    notifyListeners();
  });
};

const handleConfirm = () => {
  if (globalConfirmState.resolve) {
    globalConfirmState.resolve(true);
  }
  globalConfirmState = { ...globalConfirmState, isOpen: false, resolve: null };
  notifyListeners();
};

const handleCancel = () => {
  if (globalConfirmState.resolve) {
    globalConfirmState.resolve(false);
  }
  globalConfirmState = { ...globalConfirmState, isOpen: false, resolve: null };
  notifyListeners();
};

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(globalConfirmState);

  useEffect(() => {
    const listener = (newState: ConfirmState) => setState(newState);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  if (!state.isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{state.title}</h3>
        <p className={styles.message}>{state.message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            {state.cancelText || 'Отмена'}
          </button>
          <button 
            className={`${styles.confirmBtn} ${state.type === 'warning' ? styles.warning : ''}`}
            onClick={handleConfirm}
          >
            {state.confirmText || 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}

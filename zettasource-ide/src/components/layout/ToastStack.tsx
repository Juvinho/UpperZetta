import React, { useEffect } from "react";
import { ToastEntry } from "../../types/ide";

interface ToastStackProps {
  toasts: ToastEntry[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps): React.ReactElement {
  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        onDismiss(toast.id);
      }, 3600)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [toasts, onDismiss]);

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.level}`}>
          <span>{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)}>x</button>
        </div>
      ))}
    </div>
  );
}

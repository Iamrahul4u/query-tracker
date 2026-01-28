/**
 * Toast - Notification component
 *
 * Features:
 * - Auto-dismiss after 3 seconds
 * - Manual close button
 * - Different types (success, error, warning, info)
 * - Stacks multiple toasts
 * - Smooth animations
 */

import { useEffect } from "react";
import { ToastType } from "../hooks/useToast";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ id, message, type, onClose }: ToastProps) {
  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  };

  const icons = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      className={`
        ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg 
        flex items-center gap-2 min-w-[300px] max-w-[500px]
        animate-slide-in-right
      `}
    >
      <span className="text-xl font-bold flex-shrink-0">{icons[type]}</span>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-80 text-lg font-bold flex-shrink-0"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

/**
 * ToastContainer - Renders all active toasts
 */
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
  }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
}

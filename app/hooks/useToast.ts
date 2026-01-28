/**
 * useToast - Toast notification state management
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss after 3 seconds
 * - Stack multiple toasts
 * - Manual dismiss
 */

import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, type: ToastType) => void;
  hideToast: (id: string) => void;
  clearAll: () => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message, type) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

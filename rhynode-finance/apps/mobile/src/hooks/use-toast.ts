import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const MAX_VISIBLE_TOASTS = 3;

interface ToastStore {
  toasts: Toast[];
  queue: Toast[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
  hideToast: (id: string) => void;
}

let idCounter = 0;

function createToast(message: string, type: ToastType): Toast {
  idCounter += 1;

  return { id: `toast-${idCounter}`, message, type };
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  queue: [],
  show: (message, type = 'info') => {
    const toast = createToast(message, type);

    set((state) => {
      if (state.toasts.length < MAX_VISIBLE_TOASTS) {
        return { toasts: [...state.toasts, toast] };
      }

      return { queue: [...state.queue, toast] };
    });
  },
  dismiss: (id) => {
    set((state) => {
      const isVisible = state.toasts.some((toast) => toast.id === id);
      const nextVisible = state.toasts.filter((toast) => toast.id !== id);
      const nextQueue = state.queue.filter((toast) => toast.id !== id);

      if (!isVisible) {
        return { queue: nextQueue };
      }

      if (state.queue.length === 0) {
        return { toasts: nextVisible };
      }

      const [promoted, ...restQueue] = state.queue;

      return { toasts: [...nextVisible, promoted], queue: restQueue };
    });
  },
  hideToast: (id) => {
    get().dismiss(id);
  },
}));

export const showToast = (message: string, type?: ToastType) => {
  useToast.getState().show(message, type);
};

export const hideToast = (id: string) => {
  useToast.getState().hideToast(id);
};

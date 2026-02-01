import { create } from 'zustand';

interface AuthModalState {
  isOpen: boolean;
  pendingAction: (() => void) | null;
  returnMessage: string | null;

  openAuthModal: (message?: string) => void;
  closeAuthModal: () => void;
  setPendingAction: (action: (() => void) | null) => void;
  executePendingAction: () => void;
  clearPendingAction: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set, get) => ({
  isOpen: false,
  pendingAction: null,
  returnMessage: null,

  openAuthModal: (message) => set({ isOpen: true, returnMessage: message || null }),

  closeAuthModal: () => set({ isOpen: false, returnMessage: null }),

  setPendingAction: (action) => set({ pendingAction: action }),

  executePendingAction: () => {
    const { pendingAction } = get();
    if (pendingAction) {
      pendingAction();
      set({ pendingAction: null, isOpen: false, returnMessage: null });
    }
  },

  clearPendingAction: () => set({ pendingAction: null }),
}));

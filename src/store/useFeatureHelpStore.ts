import { create } from 'zustand';

interface FeatureHelpState {
  isHelpMode: boolean;
  toggleHelpMode: () => void;
  setHelpMode: (isOpen: boolean) => void;
}

export const useFeatureHelpStore = create<FeatureHelpState>((set) => ({
  isHelpMode: false,
  toggleHelpMode: () => set((state) => ({ isHelpMode: !state.isHelpMode })),
  setHelpMode: (isOpen) => set({ isHelpMode: isOpen }),
}));

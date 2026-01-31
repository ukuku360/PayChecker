import { useState, useCallback, useMemo } from 'react';

export type ModalName =
  | 'addJob'
  | 'export'
  | 'profile'
  | 'feedback'
  | 'readme'
  | 'adminFeedback'
  | 'rosterScanner';

interface ModalState {
  isOpen: (name: ModalName) => boolean;
  open: (name: ModalName) => void;
  close: (name: ModalName) => void;
  toggle: (name: ModalName) => void;
}

export function useModalState(): ModalState {
  const [openModals, setOpenModals] = useState<Set<ModalName>>(new Set());

  const isOpen = useCallback(
    (name: ModalName) => openModals.has(name),
    [openModals]
  );

  const open = useCallback((name: ModalName) => {
    setOpenModals((prev) => new Set(prev).add(name));
  }, []);

  const close = useCallback((name: ModalName) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const toggle = useCallback((name: ModalName) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  return useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );
}

import { useRef, useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { BottomSheet } from '../../ui/BottomSheet';

interface NoteEditorProps {
  position: { top: number; left: number; openAbove?: boolean };
  initialNote: string;
  onClose: () => void;
  onSave: (note: string) => void;
  isMobile?: boolean;
}

export const NoteEditor = ({ position, initialNote, onClose, onSave, isMobile: isMobileProp }: NoteEditorProps) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const [tempNote, setTempNote] = useState(initialNote);
  const isMobileQuery = useMediaQuery('(max-width: 768px)');
  const isMobile = isMobileProp ?? isMobileQuery;

  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (noteRef.current && !noteRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isMobile]);

  const noteContent = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-yellow-700">
          Shift Note
        </span>
        {!isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <textarea
        value={tempNote}
        onChange={(e) => setTempNote(e.target.value)}
        placeholder="Add a note..."
        autoFocus
        onClick={(e) => e.stopPropagation()}
        className="w-full h-24 bg-white/50 border border-yellow-200 rounded-lg text-sm p-3 text-slate-700 resize-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 min-h-[100px]"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave(tempNote);
        }}
        className="w-full py-3 min-h-[44px] bg-yellow-400 text-yellow-900 rounded-lg text-sm font-bold hover:bg-yellow-500 active:bg-yellow-600 transition-colors flex items-center justify-center gap-1.5 mt-3"
      >
        <Check className="w-4 h-4" /> Save Note
      </button>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        snapPoints={[0.35, 0.5]}
        initialSnap={0}
        closeOnBackdropClick={false}
      >
        <div className="pb-4 bg-yellow-50 -mx-4 -mt-3 px-4 pt-4 rounded-t-2xl">
          {noteContent}
        </div>
      </BottomSheet>
    );
  }

  return (
    <div
      ref={noteRef}
      style={{
        top: position.top,
        left: position.left,
        position: 'fixed',
      }}
      className={clsx(
        '-translate-x-1/2 z-[999] bg-yellow-50 rounded-xl shadow-xl border border-yellow-200 p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-150 flex flex-col',
        position.openAbove !== false ? '-translate-y-full mt-[-10px]' : 'mt-[10px]'
      )}
    >
      {noteContent}
    </div>
  );
};

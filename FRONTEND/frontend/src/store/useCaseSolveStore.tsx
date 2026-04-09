import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface Media {
  file_path: string;
  file_type: string;
  title: string;
}

interface userMsg {
  sender: 'user' | 'assistant' | 'system';
  text: string;
  du?: string;
  media?: Media[];
}

interface Hint {
  sequence_no: number;
  text: string;
  cost: number;
}

interface CaseSolvingState {
  attemptId: string | null;
  messages: userMsg[];
  unlockedHints: Hint[];
  startTime: number | null;
  setAttempt: (id: string, startTime: number | null) => void;
  addMessage: (msg: userMsg) => void;
  addHint: (hint: Hint) => void;
  reset: () => void;
  undoLastAction: (duId: string) => void;
}

export const useCaseSolvingStore = create<CaseSolvingState>()(
  persist(
    (set) => ({
      attemptId: null,
      messages: [],
      unlockedHints: [],
      startTime: null,
      
      setAttempt: (id) => set({ attemptId: id, startTime: Date.now() }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      addHint: (hint) => set((state) => ({ unlockedHints: [...state.unlockedHints, hint] })),
      reset: () => set({ attemptId: null, messages: [], unlockedHints: [], startTime: null }),
      undoLastAction: (duId) => set((state) => ({ messages: state.messages.filter(m => m.du !== duId) })),
    }),
    { 
      name: 'case-solving-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
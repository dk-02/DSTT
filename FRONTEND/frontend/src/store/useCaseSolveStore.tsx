import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Media {
  file_path: string;
  file_type: string;
  title: string;
}

interface userMsg {
  sender: 'korisnik' | 'llm-mentor' | 'sustav';
  text: string;
  du?: string;
  media?: Media[];
}

interface Hint {
  sequence_no: number;
  text: string;
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
      
      setAttempt: (id, startedAt) => set({ attemptId: id, startTime: startedAt }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      addHint: (hint) => set((state) => ({ unlockedHints: [...state.unlockedHints, hint] })),
      reset: () => set({ attemptId: null, messages: [], unlockedHints: [], startTime: null }),
      undoLastAction: (duId) => set((state) => {
        const index = state.messages.findIndex(m => m.du === duId);
        
        if (index > 0) {
          const newMessages = [...state.messages];
          // Briše se poruka sustava (index) i korisnički upit prije nje (index - 1)
          newMessages.splice(index - 1, 2); 
          return { messages: newMessages };
        } else if (index === 0) {
          const newMessages = [...state.messages];
          newMessages.splice(0, 1);
          return { messages: newMessages };
        }
        
        return state;
      }),
    }),
    { 
      name: 'case-solving-storage-default',
      // storage: createJSONStorage(() => localStorage)
      skipHydration: true
    }
  )
);
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Media {
    file_path: string;
    file_type: string;
    title: string;
}

export interface UserMsg {
    sender: 'korisnik' | 'llm-mentor' | 'odgovor';
    text: string;
    du?: string;
    media?: Media[];
    cost?: {
        money: number;
        time: number;
        penalty_money: number;
        penalty_time: number;
    }
}

export interface Hint {
    sequence_no: number;
    text: string;
}

interface CaseSolvingState {
    attemptId: string | null;
    messages: UserMsg[];
    unlockedHints: Hint[];
    startTime: number | null;
    totalCostTime: string | null;
    totalCostMoney: number | null;
    totalPenaltyTime: string | null;
    totalPenaltyMoney: number | null;
    setTotalCostTime: (time: string) => void;
    setTotalCostMoney: (money: number) => void;
    setTotalPenaltyTime: (penaltyTime: string) => void;
    setTotalPenaltyMoney: (penaltyMoney: number) => void;
    setAttempt: (id: string, startTime: number | null) => void;
    addMessage: (msg: UserMsg) => void;
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
            totalCostTime: null,
            totalCostMoney: null,
            totalPenaltyTime: null,
            totalPenaltyMoney: null,
            setTotalCostTime: (time) => set({ totalCostTime: time }),
            setTotalCostMoney: (money) => set({ totalCostMoney: money }),
            setTotalPenaltyTime: (penaltyTime) => set({ totalPenaltyTime: penaltyTime }),
            setTotalPenaltyMoney: (penaltyMoney) => set({ totalPenaltyMoney: penaltyMoney }),
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
            skipHydration: true
        }
    )
);
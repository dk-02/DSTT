import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DUType = 'data' | 'action';
export type DULevel = 1 | 2 | 3;
export type consequenceType = 'warning' | 'terminate';
export type caseType = 'practice' | 'exam';

export interface DiagnosticUnit {
    id: string;
    label: string;
    name: string;
    type: DUType;
    level: DULevel;
    result_text: string;
    media: File[];
    provides: string[];
    resources: { 
        money: number; 
        time: number; 
        time_unit: string;
    };
    required_units: string[]; 
    consequences: { 
        type: consequenceType; 
        value: string; 
        required_id: string;
        penalty_money?: number; 
        penalty_time?: number;
        penalty_time_unit?: string; 
    }[];
}

interface CaseData {
    id: string;
    title: string;
    level: string;
    type: caseType;
    is_public: boolean;
    initial_info: string;
    correct_diagnosis: string;
    category_id: string;
    hints: { 
        sequence_no: number; 
        text: string; 
    }[];
    diagnostic_units: DiagnosticUnit[];
    media: File[];
    changeLog: string;
    status: string;
    budget: {
        money: number; 
        time: number; 
        time_unit: string;
    }
}

export interface Category {
    id: string;
    name: string;
    parent_id: string;
}

interface CaseState {
    step: number;
    caseData: CaseData;
    categories: Category[];
    setCaseData: (data: CaseData) => void;
    setCaseId: (id: string) => void;
    setChangeLog: (log: string) => void;
    setCategories: (categories: Category[]) => void;
    setStep: (step: number) => void;
    updateCaseData: (data: Partial<CaseState['caseData']>) => void;
    clearCaseData: () => void;
    addDU: () => void;
    updateDU: (id: string, data: Partial<DiagnosticUnit>) => void;
    removeDU: (id: string) => void;
    addHint: () => void;
    removeHint: (indexToRemove: number) => void;
}

const initialCaseData : CaseData = {
    id: '',
    title: '',
    level: 'novice',
    type: 'practice',
    is_public: false,
    initial_info: '',
    correct_diagnosis: '',
    category_id: '',
    hints: [],
    diagnostic_units: [],
    media: [],
    changeLog: '',
    status: '',
    budget: {
        money: 0, 
        time: 0,
        time_unit: 'minutes'
    }
}

export const useCaseStore = create<CaseState>()(
    persist(
        (set) => ({
        step: 1,
        caseData: { ...initialCaseData },
        categories: [],
        setCaseData: (data) => set({ caseData: data }),
        setCaseId: (id) => set((state) => ({
            caseData: {
                ...state.caseData,
                id: id
            }
        })),
        setChangeLog: (log) => set((state) => ({
            caseData: {
                ...state.caseData,
                change_log: log
            }
        })),
        setCategories: (categories) => set({ categories }),
        setStep: (step) => set({ step }),
        updateCaseData: (data) => set((state) => ({ caseData: { ...state.caseData, ...data } })),
        clearCaseData: () => set({ caseData: { ...initialCaseData }, step: 1 }),
        addDU: () => set((state) => ({
            caseData: {
            ...state.caseData,
            diagnostic_units: [
                ...state.caseData.diagnostic_units,
                {
                id: crypto.randomUUID(),
                label: '',
                name: '',
                type: 'data',
                level: 1,
                result_text: '',
                media: [],
                provides: [],
                resources: { money: 0, time: 0, time_unit: 'minutes' },
                required_units: [],
                consequences: []
                }
            ]
            }
        })),
        updateDU: (id, data) => set((state) => ({
            caseData: {
            ...state.caseData,
            diagnostic_units: state.caseData.diagnostic_units.map(du => du.id === id ? { ...du, ...data } : du)
            }
        })),
        removeDU: (id) => set((state) => ({
            caseData: {
            ...state.caseData,
            diagnostic_units: state.caseData.diagnostic_units.filter(du => du.id !== id)
            }
        })),
        removeHint: (indexToRemove: number) => set((state) => {
            const newHints = state.caseData.hints
            .filter((_, index) => index !== indexToRemove)
            .map((hint, index) => ({ ...hint, sequence_no: index + 1 }));

            return {
            caseData: { ...state.caseData, hints: newHints }
            };
        }),
        addHint: () => set((state) => ({
            caseData: {
            ...state.caseData,
            hints: [
                ...state.caseData.hints, 
                { 
                text: '',
                sequence_no: state.caseData.hints.length + 1
                }
            ]
            }
        }))
        }),
        {
            name: 'case-creator-storage', 
            // storage: createJSONStorage(() => localStorage),
            storage: createJSONStorage(() => {
                const authData = localStorage.getItem('auth-storage');
                let userId = 'guest';
                
                if (authData) {
                    try {
                        const parsed = JSON.parse(authData);
                        userId = parsed.state?.user?.id || 'guest';
                    } catch (e) {
                        console.error("Greška pri čitanju korisnika za storage key", e);
                    }
                }
                
                return {
                    getItem: (name) => localStorage.getItem(`${name}-${userId}`),
                    setItem: (name, value) => localStorage.setItem(`${name}-${userId}`, value),
                    removeItem: (name) => localStorage.removeItem(`${name}-${userId}`),
                };
            }),
            
            partialize: (state) => ({
                step: state.step,
                caseData: {
                    ...state.caseData,
                    media: [],
                    diagnostic_units: state.caseData.diagnostic_units.map(du => ({
                        ...du,
                        media: []
                    }))
                }
            }),
        }
    )  
);
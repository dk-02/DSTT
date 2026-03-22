import { create } from 'zustand';

export type DUType = 'DATA' | 'ACTION';
export type DULevel = 1 | 2 | 3;
export type IncorrectDiagnosisConsequence = 'terminate' | 'penalize' | 'continue';
export type consequenceType = 'WARNING' | 'TERMINATE';

export interface DiagnosticUnit {
  id: string;
  label: string;
  name: string;
  type: DUType;
  level: DULevel;
  result_text: string;
  media: File[];
  provides: string[];
  resources: { money: number; time: number; time_unit: string };
  required_units: string[]; 
  consequences: { type: consequenceType; value: string; required_id: string }[];
}

interface CaseState {
  step: number;
  caseData: {
    title: string;
    level: string;
    type: 'EXERCISE' | 'EXAM';
    is_public: boolean;
    initial_info: string;
    correct_diagnosis: string;
    if_incorrect: IncorrectDiagnosisConsequence;
    category: string;
    hints: { sequence_no: number, text: string; cost: number }[];
    diagnostic_units: DiagnosticUnit[];
    media: File[];
  };
  setStep: (step: number) => void;
  updateCaseData: (data: Partial<CaseState['caseData']>) => void;
  addDU: () => void;
  updateDU: (id: string, data: Partial<DiagnosticUnit>) => void;
  removeDU: (id: string) => void;
  addHint: () => void;
  removeHint: (indexToRemove: number) => void;
}

export const useCaseStore = create<CaseState>((set) => ({
  step: 1,
  caseData: {
    title: '',
    level: 'novice',
    type: 'EXERCISE',
    is_public: false,
    initial_info: '',
    correct_diagnosis: '',
    if_incorrect: 'terminate',
    category: '',
    hints: [],
    diagnostic_units: [],
    media: [],
  },
  setStep: (step) => set({ step }),
  updateCaseData: (data) => set((state) => ({ caseData: { ...state.caseData, ...data } })),
  addDU: () => set((state) => ({
    caseData: {
      ...state.caseData,
      diagnostic_units: [
        ...state.caseData.diagnostic_units,
        {
          id: crypto.randomUUID(),
          label: "label_placeholder",
          name: '',
          type: 'DATA',
          level: 1,
          result_text: '',
          media: [],
          provides: ["info_placeholder"],
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
          cost: 0, 
          sequence_no: state.caseData.hints.length + 1
        }
      ]
    }
  })),
}));
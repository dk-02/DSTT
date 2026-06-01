import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export interface Group {
    id: string;
    name: string;
    academic_year: string;
    teacher_name: string;
    institution_name: string;
    student_count: number;
}

interface AssignmentCaseDetail {
    id: string;
    title: string;
    version: number;
    level: string;
    topic_name: string;
    sequence_no: number;
    status: string;
}

interface AssignedGroups {
    group_id: string;
    group_name: string;
    available_until: string;
}

interface Settings {
    enable_undo: boolean;
    enable_hints: boolean;
    ignore_hint_cost: boolean;
    enable_LLM_mentor: boolean;
    case_sequence_lock: boolean;
    randomly_choose_cases: boolean;
    show_result_immediately: boolean;
    ignore_terminating_consequences: boolean;
}

export interface AssignmentDetails {
    id: string;
    title: string;
    type: string;
    instructions: string;
    cases: AssignmentCaseDetail[];
    case_count: number;
    assigned_groups: AssignedGroups[];
    settings: Settings;
}

export interface Assignment {
    id: string;
    title: string;
    type: string;
    available_until: string;
    instructions: string;
    status: string; // active ili archived
}

export interface User {
    id: string; 
    first_name: string;
    last_name: string;
    email: string;
    expertise_level: string;
    xp_points: number;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface TeacherStoreState {
    selectedAssignment: AssignmentDetails | null;
    setSelectedAssignment: (assignment: AssignmentDetails | null) => void;
    selectedAssignmentFullDetails: AssignmentDetails | null;
    setSelectedAssignmentFullDetails: (details: AssignmentDetails | null) => void;

    teacherGroups: Group[];
    setTeacherGroups: (groups: Group[]) => void;
    selectedGroup: Group | null;
    setSelectedGroup: (group: Group | null) => void;
    groupAssignments: Assignment[];
    groupMembers: User[];
    setGroupMembers: (members: User[]) => void;

    handleViewGroup: (group: Group) => Promise<void>;

    hasFetchedGroups: boolean;
    fetchTeacherGroups: () => Promise<void>;
}

export const useTeacherStore = create<TeacherStoreState>((set) => ({
    // Početne vrijednosti
    selectedAssignment: null,
    setSelectedAssignment: (assignment) => set({ selectedAssignment: assignment }),
    selectedAssignmentFullDetails: null,
    setSelectedAssignmentFullDetails: (details) => set({ selectedAssignmentFullDetails: details }),

    teacherGroups: [],
    setTeacherGroups: (groups) => set({ teacherGroups: groups }),
    selectedGroup: null,
    setSelectedGroup: (group) => set({ selectedGroup: group }),
    groupAssignments: [],
    groupMembers: [],
    setGroupMembers: (members) => set({ groupMembers: members }),

    handleViewGroup: async (group) => {
        set({ selectedGroup: group });
        
        const token = useAuthStore.getState().token; 
        
        try {
            const assignmentRes = await fetch(`${backendURL}/groups/${group.id}/assignments`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const membersRes = await fetch(`${backendURL}/groups/${group.id}/members`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (assignmentRes.ok && membersRes.ok) {
                set({ 
                    groupAssignments: await assignmentRes.json(), 
                    groupMembers: await membersRes.json() 
                });
            }
        } catch (error) {
            console.error("Greška pri dohvaćanju podataka o grupi.", error);
        }
    },
    hasFetchedGroups: false,
    fetchTeacherGroups: async () => {
        const token = useAuthStore.getState().token; 
        try {
            const res = await fetch(`${backendURL}/groups`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ teacherGroups: data });
            }
        } catch (error) {
            console.error("Greška pri dohvaćanju grupa", error);
        }
    },
}));
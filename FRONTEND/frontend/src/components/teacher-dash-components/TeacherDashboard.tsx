import { useNavigate } from "react-router-dom";
import { Modal } from "../UI/Modal";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useCaseSolvingStore } from "../../store/useCaseSolveStore";
import { useCaseStore, type DiagnosticUnit } from "../../store/useCaseStore";
import { Dropdown } from "../UI/Dropdown";
import { Star01, User01, Users01, Calendar, GraduationHat02, Settings01, Edit01, ArrowNarrowUp, ArrowNarrowDown } from "@untitledui/icons";
import { AssignmentCreator } from "./AssignmentCreator";

interface Case {
    id: string;
    title: string;
    level: number;
    topic_name: string;
    version: number;
    status?: string;
    type?: string;
    correct_diagnosis?: string; 
}

interface Group {
    id: string;
    name: string;
    academic_year: string;
    teacher_name: string;
    institution_name: string;
    student_count: number;
}

interface AssignedGroups {
    group_id: string;
    group_name: string;
    available_until: string;
}

interface Assignment {
    id: string;
    title: string;
    type: string;
    available_until: string;
    instructions: string;
    status: string; // active ili archived
}

interface User {
    id: string; 
    first_name: string;
    last_name: string;
    email: string;
    expertise_level: string;
    xp_points: number;
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

interface AssignmentDetails {
    id: string;
    title: string;
    type: string;
    instructions: string;
    cases: AssignmentCaseDetail[];
    case_count: number;
    assigned_groups: AssignedGroups[];
    settings: Settings;
}

interface EditAssignmentFormData {
    title: string;
    instructions: string;
    case_sequence?: string[];
}

interface GroupToAssign {
    group_id: string;
    available_until: string;
}

type filterTypes = "all" | "mine" | "public" | "drafts" | "archived";
type TabName = "groups" | "assignments" | "cases";

const backendURL = import.meta.env.VITE_APP_BACKEND;

function TeacherDashboard() {    
    // CASES
    const [myCases, setMyCases] = useState<Case[]>([]);
    const [publicCases, setPublicCases] = useState<Case[]>([]);
    const [filter, setFilter] = useState<filterTypes>("all");
    const [menuTab, setMenuTab] = useState<TabName>("cases");
    const [caseToArchiveId, setCaseToArchiveId] = useState<string>("");
    const [caseArchiveModalOpen, setCaseArchiveModalOpen] = useState<boolean>(false);
    const [archivedCases, setArchivedCases] = useState<Case[]>([]);
    // GROUPS
    const [teacherGroups, setTeacherGroups] = useState<Group[]>([]);
    const [createGroupModalOpen, setCreateGroupModalOpen] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        name: "",
        academic_year: ""
    });
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupAssignments, setGroupAssignments] = useState<Assignment[]>([]);
    const [groupMembers, setGroupMembers] = useState<User[]>([]);

    // USERS/STUDENTS
    const [students, setStudents] = useState<User[]>([]);
    const [addStudentToGroupModalOpen, setAddStudentToGroupModalOpen] = useState<boolean>(false);
    const [selectedStudents, setSelectedStudents] = useState<User[]>([]); // ADD
    const [studentsToRemove, setStudentsToRemove] = useState<User[]>([]); // REMOVE
    const [removeStudentFromGroupModalOpen, setRemoveStudentFromGroupModalOpen] = useState<boolean>(false);

    // ASSIGNMENTS
    const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
    const [archivedTeacherAssignments, setArchivedTeacherAssignments] = useState<Assignment[]>([]);    
    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetails | null>(null); // GROUPS prikaz
    const [assignmentDetailsModalOpen, setAssignmentDetailsModalOpen] = useState(false);
    const [selectedAssignmentFullDetails, setSelectedAssignmentFullDetails] = useState<AssignmentDetails | null>(null); // ASSIGNMENTS prikaz
    const [assignmentCreatorOpen, setAssignmentCreatorOpen] = useState<boolean>(false);
    const [assignmentSettingsModalOpen, setAssignmentSettingsModalOpen] = useState<boolean>(false);
    const [localSettings, setLocalSettings] = useState<Settings | null>(null);
    const [editingAssignmentModalOpen, setEditingAssignmentModalOpen] = useState<boolean>(false);
    const [editAssignmentFormData, setEditAssignmentFormData] = useState<EditAssignmentFormData>({
        title: "",
        instructions: "",
        case_sequence: []
    })
    const [assignmentArchiveModalOpen, setAssignmentArchiveModalOpen] = useState<boolean>(false);
    const [assignmentToArchiveId, setAssignmentToArchiveId] = useState<string>("");
    const [assignmentFilter, setAssignmentFilter] = useState<"active" | "archived">("active");

    const [removingCasesFromAssignment, setRemovingCaseFromAssignment] = useState<boolean>(false);
    const [casesToRemoveIds, setCasesToRemoveIds] = useState<string[]>([]);

    const [assigningToGroupsModalOpen, setAssigningToGroupsModalOpen] = useState<boolean>(false);
    const [groupsToAssign, setGroupsToAssign] = useState<GroupToAssign[]>([]);

    const [unassigningFromGroupsModalOpen, setUnassigningFromGroupsModalOpen] = useState<boolean>(false);
    const [groupsToUnassign, setGroupsToUnassign] = useState<string[]>([]);

    const [addingCasesToAssignment, setAddingCasesToAssignment] = useState<boolean>(false);
    const [casesToAddIds, setCasesToAddIds] = useState<string[]>([]);
    const [previewCases, setPreviewCases] = useState<Case[]>([]);

    const [localCases, setLocalCases] = useState<AssignmentCaseDetail[]>([]);

    useEffect(() => {
        if (editingAssignmentModalOpen && selectedAssignmentFullDetails?.cases) {
            setLocalCases([...selectedAssignmentFullDetails.cases].sort((a, b) => a.sequence_no - b.sequence_no));
        }
    }, [editingAssignmentModalOpen, selectedAssignmentFullDetails]);

    useEffect(() => {
        if (assignmentSettingsModalOpen && selectedAssignmentFullDetails?.settings) {
            setLocalSettings(JSON.parse(JSON.stringify(selectedAssignmentFullDetails.settings)));
        }
    }, [assignmentSettingsModalOpen, selectedAssignmentFullDetails]);

    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const setAttempt = useCaseSolvingStore((state) => state.setAttempt);
    const setCaseData = useCaseStore((state) => state.setCaseData);

    const navigate = useNavigate();

    const menuTabs = [
        { name: "cases", label: "Slučajevi" },
        { name: "groups", label: "Grupe" },
        { name: "assignments", label: "Zadaće" }
    ]

    const fetchedTabs = useRef({
        cases: false,
        groups: false,
        assignments: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
    };

    const handleEditAssignmentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        setEditAssignmentFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
    };

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const myRes = await fetch(`${backendURL}/cases/authored`, {
                    method: "GET",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json" 
                    }
                });

                const myData = await myRes.json();
                setMyCases(myData);


                const archiveRes = await fetch(`${backendURL}/cases/authored/archive`, {
                    method: "GET",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json" 
                    }
                });

                const archiveData = await archiveRes.json();
                setArchivedCases(archiveData);


                const pubRes = await fetch(`${backendURL}/cases/available`, {
                    method: "GET",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json" 
                    }
                });

                const pubData = await pubRes.json();
                setPublicCases(pubData.filter((c: Case) => !myData.some((m: Case) => m.id === c.id)));

            } catch (error) {
                console.error("Greška pri dohvaćanju podataka", error);
            }
        };

        const fetchGroups = async () => {
            try {
                const res = await fetch(`${backendURL}/groups`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setTeacherGroups(await res.json());
            } catch (error) {
                console.error("Greška pri dohvaćanju grupa", error);
            }
        };

        const fetchAssignments = async () => {
            try {
                const activeRes = await fetch(`${backendURL}/assignments/dashboard`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (activeRes.ok) setTeacherAssignments(await activeRes.json());

                const archiveRes = await fetch(`${backendURL}/assignments/dashboard/archive`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (archiveRes.ok) setArchivedTeacherAssignments(await archiveRes.json());

            } catch (error) {
                console.error("Greška pri dohvaćanju zadaća", error);
            }
        };

        if (menuTab === "cases" && !fetchedTabs.current.cases) {
            fetchCases();
        } else if (menuTab === "groups" && !fetchedTabs.current.groups) {
            fetchGroups();
        } else if (menuTab === "assignments" && !fetchedTabs.current.assignments) {
            fetchAssignments();
        }

    }, [menuTab, token]);


    const displayedCases = () => {
        if (filter === "mine") return myCases;
        if (filter === "public") return publicCases;
        if (filter === "drafts") return myCases.filter((c: Case) => c.status === "draft"); 
        if (filter === "archived") return archivedCases;
        return [...myCases, ...publicCases];
    };


    const handleGetAvailableStudents = async () => {
        if (!selectedGroup) return;

        try {
            const response = await fetch(`${backendURL}/groups/${selectedGroup.id}/available-students`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) throw new Error("Neuspješno dohvaćanje podataka");
            const studentData = await response.json();

            setStudents(studentData);

        } catch (error) {
            console.error("Greška pri dohvaćanju podataka o studentima:", error);
            alert("Nije moguće učitati podatke studenata.");
        }
    }


    const handleEditCase = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}/full`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) throw new Error("Neuspješno dohvaćanje podataka");
            const fullCaseData = await response.json();

            const dataForStore = {
                ...fullCaseData,
                media: [], 
                diagnostic_units: fullCaseData.diagnostic_units.map((du: DiagnosticUnit) => ({
                    ...du,
                    media: [], 
                    required_units: du.required_units || []
                }))
            };

            setCaseData(dataForStore);
            navigate(`/case/edit/${caseId}`);

        } catch (error) {
            console.error("Greška pri pripremi za uređivanje:", error);
            alert("Nije moguće učitati podatke za uređivanje.");
        }
    };


    const handleStartCase = async (caseId: string, assignmentId: string | null = null, assignmentType: string | null = null) => {
        const isPractice = assignmentId === null || assignmentType === "practice" || assignmentType === "practice_exam";
        const isExamSimulation = assignmentType === "practice_exam";
        
        try {
            const response = await fetch(`${backendURL}/attempts/start`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    case_id: caseId,
                    assignment_id: assignmentId,
                    is_practice: isPractice,
                    is_exam_simulation: isExamSimulation
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Greška pri pokretanju slučaja");
            }

            const data = await response.json();

            setAttempt(data.attempt_id, data.started_at);
            navigate(`/case/solve/${data.attempt_id}`);

        } catch (error) {
            console.error("Greška", error);
        }
    }


    const handleArchiveCase = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}/archive`, {
                method: "PATCH",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.detail);
                throw new Error(errorData.detail || "Greška pri arhiviranju");
            }
            
            const cs = myCases.find(cs => cs.id === caseId);
            if (cs) {
                setMyCases(prevCases => prevCases.filter(c => c.id !== cs.id));
                setArchivedCases(prevArchived => [...prevArchived, { ...cs, status: "archived" }]);
            }

            setCaseArchiveModalOpen(false);
    
        } catch (error) {
            console.error("Greška:", error);
        }
    };

    const handleUnarchiveCase = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}/unarchive`, {
                method: "PATCH",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.detail);
                throw new Error(errorData.detail || "Greška pri vraćanju slučaja.");
            }
            
            const cs = archivedCases.find(cs => cs.id === caseId);
            if (cs) {
                setMyCases(prevCases => [...prevCases, { ...cs, status: "draft" }]);
                setArchivedCases(prevArchived => prevArchived.filter(c => c.id !== cs.id));
            }
    
        } catch (error) {
            console.error("Greška:", error);
        }
    };


    const handleArchiveAssignment = async (assignmentId: string) => {
        try {
            const response = await fetch(`${backendURL}/assignments/${assignmentId}/archive`, {
                method: "PATCH",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.detail);
                throw new Error(errorData.detail || "Greška pri arhiviranju");
            }
            
            const ta = teacherAssignments.find(ta => ta.id === assignmentId);
            if (ta) {
                setTeacherAssignments(prevAssignments => prevAssignments.filter(a => a.id !== ta.id));
                setArchivedTeacherAssignments(prevArchived => [...prevArchived, { ...ta, status: "archived" }]);
            }

            setAssignmentArchiveModalOpen(false);
    
        } catch (error) {
            console.error("Greška:", error);
        }
    };

    const handleUnarchiveAssignment = async (assignmentId: string) => {
        try {
            const response = await fetch(`${backendURL}/assignments/${assignmentId}/unarchive`, {
                method: "PATCH",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.detail);
                throw new Error(errorData.detail || "Greška pri vraćanju zadaće.");
            }
            
            const ta = archivedTeacherAssignments.find(ta => ta.id === assignmentId);
            if (ta) {
                setTeacherAssignments(prevArchived => [...prevArchived, { ...ta, status: "active" }]);
                setArchivedTeacherAssignments(prevAssignments => prevAssignments.filter(a => a.id !== ta.id));
            }
    
        } catch (error) {
            console.error("Greška:", error);
        }
    };


    const handleCreateGroup = async () => {
        try {
            const res = await fetch(`${backendURL}/groups`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({
                    name: formData.name,
                    teacher_id: user?.id,
                    academic_year: formData.academic_year
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                alert(errorData.detail);
                throw new Error(errorData.detail || "Greška pri kreiranju grupe.");
            }            
    
        } catch (error) {
            console.error("Greška:", error);
        }
    };

    const handleViewGroup = async (group: Group) => {
        setSelectedGroup(group);

        try {
            const assignmentRes = await fetch(`${backendURL}/groups/${group.id}/assignments`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            const assignmentData = await assignmentRes.json();
            setGroupAssignments(assignmentData);

            const membersRes = await fetch(`${backendURL}/groups/${group.id}/members`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            const membersData = await membersRes.json();
            setGroupMembers(membersData);

        } catch (error) {
            console.error("Greška pri dohvaćanju podataka o grupi.", error);
        }
    };


    const moveUser = (
        user: User, 
        setFrom: React.Dispatch<React.SetStateAction<User[]>>, 
        setTo: React.Dispatch<React.SetStateAction<User[]>>
    ) => {
        setFrom(prev => prev.filter(u => u.id !== user.id));
        setTo(prev => [...prev, user]);
    };
            
            
    // DODAVANJE U GRUPU
    const handleSelectStudent = (student: User) => moveUser(student, setStudents, setSelectedStudents);
    const handleDeselectStudent = (student: User) => moveUser(student, setSelectedStudents, setStudents);

    const handleAddStudentsToGroup = async () => {
        if (!selectedGroup || selectedStudents.length === 0) return;

        try {
            const studentIds = selectedStudents.map(s => s.id);
            
            const res = await fetch(`${backendURL}/groups/${selectedGroup.id}/members`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ student_ids: studentIds })
            });

            if (res.ok) {
                handleViewGroup(selectedGroup); 
                setAddStudentToGroupModalOpen(false);
                setSelectedStudents([]);
            } else {
                const error = await res.json();
                alert(`Greška: ${error.detail}`);
            }
        } catch (error) {
            console.error(error);
            alert("Došlo je do mrežne pogreške.");
        }
    };


    // UKLANJANJE STUDENTA IZ GRUPE
    const handleStageForRemoval = (student: User) => moveUser(student, setGroupMembers, setStudentsToRemove);
    const handleUnstageForRemoval = (student: User) => moveUser(student, setStudentsToRemove, setGroupMembers);

    const handleRemoveStudentsFromGroup = async () => {
        if (!selectedGroup) return;

        try {
            const studentIds = studentsToRemove.map(s => s.id);

            const res = await fetch(`${backendURL}/groups/${selectedGroup.id}/members`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ student_ids: studentIds }) 
            });

            if (res.ok) {
                handleViewGroup(selectedGroup);
                setStudentsToRemove([]); 
                setRemoveStudentFromGroupModalOpen(false);
            } else {
                const error = await res.json();
                alert(`Greška: ${error.detail}`);
            }
        } catch (error) {
            console.error("Mrežna greška:", error);
        }
    };

    // ASSIGNMENTS
    const handleViewAssignment = async (assignmentId: string) => {
        try {
            const res = await fetch(`${backendURL}/assignments/${assignmentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                if (menuTab === "groups") {
                    setSelectedAssignment(data);
                    setAssignmentDetailsModalOpen(true);
                } else if (menuTab === "assignments") {
                    setSelectedAssignmentFullDetails(data);
                }
            } else {
                alert("Greška pri dohvaćanju detalja zadaće.");
            }
        } catch (error) {
            console.error("Greška", error);
            alert("Došlo je do pogreške na mreži.");
        }
    };


    // ASSIGNMENT SETTINGS
    const handleToggleSetting = (key: keyof Settings) => {
        setLocalSettings((prev) => {
            if (!prev) return null;

            return {
                ...prev,
                [key]: !prev[key]
            }
        });
    };

    const handleResetSettings = () => {
        if (selectedAssignmentFullDetails?.settings) {
            setLocalSettings(JSON.parse(JSON.stringify(selectedAssignmentFullDetails.settings)));
        }
    };

    const handleSaveSettings = async () => {
        if (!localSettings) return;

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails?.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ settings: localSettings }) 
            });

            if (res.ok) {
                setSelectedAssignmentFullDetails((prev) => {
                    if (!prev) return null;

                    return {
                        ...prev,
                        settings: localSettings
                    }
                });
                setAssignmentSettingsModalOpen(false);
            } else {
                const error = await res.json();
                alert(`Greška pri spremanju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    };


    const handleMoveCaseInModal = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= localCases.length) return;

        const updatedCases = [...localCases];
       
        const temp = updatedCases[index];
        updatedCases[index] = updatedCases[targetIndex];
        updatedCases[targetIndex] = temp;

        setLocalCases(updatedCases);
    };


    const handleUpdateAssignment = async () => {
        if (!selectedAssignmentFullDetails) return;

        const originalIds = selectedAssignmentFullDetails.cases.map(c => c.id);
        const currentIds = localCases.map(c => c.id);

        const isOrderChanged = JSON.stringify(originalIds) !== JSON.stringify(currentIds);

        const requestBody: EditAssignmentFormData = {
            title: editAssignmentFormData.title,
            instructions: editAssignmentFormData.instructions,
        };

        if (isOrderChanged) {
            requestBody.case_sequence = currentIds;
        }

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails?.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody) 
            });

            if (res.ok) {
                await handleViewAssignment(selectedAssignmentFullDetails.id);
                setEditingAssignmentModalOpen(false);
            } else {
                const error = await res.json();
                alert(`Greška pri spremanju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    };

    const toggleCaseToRemove = (caseId: string) => {
        if (!casesToRemoveIds.includes(caseId)) {
            setCasesToRemoveIds([...casesToRemoveIds, caseId]);
        } else {
            setCasesToRemoveIds(prev => prev.filter(c => c !== caseId));
        }
    }

    const toggleCaseToAdd = (caseId: string) => {
        if (!casesToAddIds.includes(caseId)) {
            setCasesToAddIds([...casesToAddIds, caseId]);
        } else {
            setCasesToAddIds(prev => prev.filter(c => c !== caseId));
        }
    }

    const handleGetAvailableCases = async () => {
        if (!selectedAssignmentFullDetails) return;

        try {
            const response = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails.id}/preview-cases`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) throw new Error("Neuspješno dohvaćanje podataka");
            const caseData = await response.json();

            setPreviewCases(caseData);

        } catch (error) {
            console.error("Greška pri dohvaćanju podataka o slučajevima:", error);
            alert("Nije moguće učitati podatke o slučajevima.");
        }
    }


    const handleAddCasesToAssignment = async () => {
        if (!selectedAssignmentFullDetails || casesToAddIds.length === 0) {
            alert("Morate odabrati slučaj/slučajeve koje želite dodati.");
            return;
        }

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails.id}/cases`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ case_ids: casesToAddIds })
            });

            if (res.ok) {
                await handleViewAssignment(selectedAssignmentFullDetails.id);
                setAddingCasesToAssignment(false);
                setCasesToAddIds([]);

            } else {
                const error = await res.json();
                alert(`Greška pri dodavanju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    }

    const handleRemoveCasesFromAssignment = async () => {
        if (!selectedAssignmentFullDetails || casesToRemoveIds.length === 0) {
            alert("Morate odabrati slučaj/slučajeve koje želite ukloniti.");
            return;
        }

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails.id}/cases`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ case_ids: casesToRemoveIds })
            });

            if (res.ok) {
                setSelectedAssignmentFullDetails(prev => {
                    if (!prev) return null;

                    const remainingCases = prev.cases.filter(c => !casesToRemoveIds.includes(c.id));

                    const resequencedCases = remainingCases.map((c, index) => ({
                        ...c,
                        sequence_no: index + 1
                    }));

                    return {
                        ...prev,
                        cases: resequencedCases
                    };
                });
                setRemovingCaseFromAssignment(false);
                setCasesToRemoveIds([]);

            } else {
                const error = await res.json();
                alert(`Greška pri brisanju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    }

    const renderEmptyState = (title: string, message: string) => (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-700/30 rounded-2xl border border-gray-600 border-dashed">
            <h3 className="text-xl font-bold text-gray-300 mb-2">{title}</h3>
            <p className="text-gray-400">{message}</p>
        </div>
    );

    const getStudentWord = (count: number) => {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        // Završava na 1, ali ne na 11 (npr. 1, 21, 101 student)
        if (lastDigit === 1 && lastTwoDigits !== 11) {
            return "student";
        } 
        // Završava na 2, 3 ili 4, ali ne na 12, 13 ili 14 (npr. 2, 3, 4, 22, 34 studenta)
        else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
            return "studenta";
        } 
        // Svi ostali slučajevi: 0, 5-19, 20, 25... (npr. 0, 5, 11, 20 studenata)
        else {
            return "studenata";
        }
    };

    const closeAssignmentModal = () => {
        setAssignmentDetailsModalOpen(false);
        setSelectedAssignment(null);
    };


    // DODJELA/UKLANJANJE ZADAĆE GRUPI
    const handleToggleGroupSelection = (groupId: string) => {
        setGroupsToAssign(prev => {
            const exists = prev.some(g => g.group_id === groupId);
            
            if (exists) {
                return prev.filter(g => g.group_id !== groupId);
            } else {
                return [...prev, { group_id: groupId, available_until: "" }];
            }
        });
    };

    const handleGroupDateChange = (groupId: string, dateValue: string) => {
        setGroupsToAssign(prev => 
            prev.map(g => 
                g.group_id === groupId ? { ...g, available_until: dateValue } : g
            )
        );
    };

    const handleAssignToGroup = async () => {
        if (!selectedAssignmentFullDetails || groupsToAssign.length === 0) return;

        const payload = groupsToAssign.map(g => {
            let utcDate = null;

            if (g.available_until !== "") {
                utcDate = new Date(g.available_until).toISOString();
            }

            return {
                group_id: g.group_id, 
                available_until: utcDate
            }
        });

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails.id}/groups`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ groups: payload })
            });

            if (res.ok) {
                await handleViewAssignment(selectedAssignmentFullDetails.id);
                setAssigningToGroupsModalOpen(false);
                if (selectedGroup) await handleViewGroup(selectedGroup);
                setGroupsToAssign([]);
            } else {
                const error = await res.json();
                alert(`Greška pri dodavanju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    }

    const handleUnassignFromGroup = async () => {
        if (!selectedAssignmentFullDetails || groupsToUnassign.length === 0) return;

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails.id}/groups`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ group_ids: groupsToUnassign })
            });

            if (res.ok) {
                await handleViewAssignment(selectedAssignmentFullDetails.id);
                setUnassigningFromGroupsModalOpen(false);
                if (selectedGroup) await handleViewGroup(selectedGroup);
                setGroupsToUnassign([]);
            } else {
                const error = await res.json();
                alert(`Greška pri dodavanju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    }

    return (
        <div className="w-full h-full flex">
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col py-6 shrink-0">
                <nav className="flex flex-col space-y-2 px-3">
                    {menuTabs.map((tab) => (
                        <button 
                            key={tab.name}
                            onClick={() => setMenuTab(tab.name as TabName)} 
                            className={`hover:cursor-pointer hover:bg-gray-700 px-4 py-3 text-left rounded-xl transition-all duration-200 font-medium ${
                                menuTab === tab.name 
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" 
                                : "text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 px-5 overflow-y-scroll">
                {menuTab === "cases" && (
                    <>
                    <div className="flex gap-4 mt-5 items-center">
                        <button onClick={() => navigate("/case/create")} className="bg-green-600 px-4 py-2 rounded font-bold hover:cursor-pointer">
                            Novi slučaj
                        </button>
                        
                        <div className="flex bg-gray-700 p-1 rounded-lg border border-gray-600">
                            <button 
                                onClick={() => setFilter("all")}
                                className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${filter === "all" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                            > Sve </button>
                            <button 
                                onClick={() => setFilter("mine")}
                                className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${filter === "mine" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                            > Moji </button>
                            <button 
                                onClick={() => setFilter("public")}
                                className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${filter === "public" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                            > Javni </button>
                            <button 
                                onClick={() => setFilter("drafts")}
                                className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${filter === "drafts" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                            > Skice </button>
                            <button 
                                onClick={() => setFilter("archived")}
                                className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${filter === "archived" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                            > Arhiva </button>
                        </div>
                    </div>

                    {displayedCases().length > 0 ? (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {displayedCases().map((c) => (
                                <div key={c.id} className="relative flex flex-col bg-gray-600 rounded-xl border border-gray-700 p-5 shadow-lg group">
                                    <div className="absolute top-2 left-2 flex gap-2">
                                        {c.status === "draft" && <span className="bg-yellow-900/30 text-yellow-500 text-[10px] px-2 py-0.5 rounded italic">Skica</span>}
                                        {c.type === "exam" && <span className="bg-red-900/30 text-red-300 text-[10px] px-2 py-1 rounded font-bold uppercase">Ispit</span>}
                                    </div>
                                    
                                    {!myCases.some(m => m.id === c.id) ? <></> : <Dropdown 
                                        onEdit={() => handleEditCase(c.id)}
                                        onArchive={() => {
                                            setCaseToArchiveId(c.id);
                                            setCaseArchiveModalOpen(true);
                                        }}
                                    /> }
                                    
                                    
                                    <div className="mt-4 flex-1">
                                        <h3 className="text-lg font-bold text-white leading-tight">{c.title}</h3>
                                        <p className="text-sm text-gray-300 mt-1">{c.topic_name} • v{c.version}</p>
                                    </div>

                                    {filter === "archived" ? <button onClick={() => handleUnarchiveCase(c.id)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-xl hover:bg-orange-600 hover:cursor-pointer transition shadow-md">
                                        Vrati slučaj
                                    </button> : <button onClick={() => handleStartCase(c.id)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-xl hover:bg-orange-600 hover:cursor-pointer transition shadow-md">
                                        Isprobaj
                                    </button>}
                                    
                                </div>
                            ))}
                        </div>
                    ) : (renderEmptyState("Nema slučajeva", 
                            filter === "archived" ? "Trenutno nemate nijedan arhivirani slučaj." 
                            : filter === "all" ? "Trenutno nema dostupnih slučajeva." 
                            : filter === "mine" ? "Trenutno nemate vlastitih slučajeva."
                            : filter === "drafts" ? "Trenutno nemate skica."
                            : filter === "public" ? "Trenutno nema javno dostupnih slučajeva."
                            : ""
                             ))}
                    
                    </>
                )}

                {menuTab === "groups" && (
                    <div className="mt-5 flex flex-col gap-6 animate-fadeIn">
                        {selectedGroup ? (
                            <div className="flex flex-col animate-fadeIn">
                                <button 
                                    onClick={() => setSelectedGroup(null)}
                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit font-medium cursor-pointer"
                                >
                                    <span>&larr;</span> Natrag na popis grupa
                                </button>
                                
                                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-md mb-8">
                                    <h2 className="text-2xl font-bold text-white mb-3">{selectedGroup.name}</h2>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
                                        <span className="flex items-center gap-2"><GraduationHat02 className="w-5"/> {selectedGroup.institution_name}</span>
                                        
                                        <span className="flex items-center gap-2"><Calendar className="w-4" /> {selectedGroup.academic_year}</span>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-200 mb-4">Zadaće u grupi</h3>
                                
                                {groupAssignments.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {groupAssignments.map((a) => {
                                            const isExam = a.type === "exam";
                                            const badgeColor = isExam ? "bg-red-900/40 text-red-400" : "bg-purple-900/40 text-purple-400";
                                            const typeLabel = a.type === "practice" ? "Vježba" : a.type === "practice_exam" ? "Probni ispit" : "Ispit";
                                            const deadline = a.available_until;

                                            return (
                                                <div key={a.id} className="flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group">
                                                    <div className="flex justify-between items-start p-4 bg-gray-700/50 border-b border-gray-600">
                                                        <span className="bg-gray-800 text-xs font-semibold px-2 py-1 rounded-md text-gray-300 truncate max-w-[60%]">
                                                            {selectedGroup.name}
                                                        </span>
                                                        <span className={`${badgeColor} text-xs font-bold px-2 py-1 rounded-md`}>
                                                            {typeLabel}
                                                        </span>
                                                    </div>
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-white mb-2">{a.title}</h3>
                                                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                                                {a.instructions || "Nema dodatnih uputa."}
                                                            </p>
                                                            {deadline && (
                                                                <div className="text-xs font-medium inline-block px-2 py-1 rounded bg-gray-800/50 text-gray-300">
                                                                    Rok: {new Date(deadline).toLocaleString('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => handleViewAssignment(a.id)} className="w-full mt-5 bg-gray-600 text-white font-bold py-2.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer border border-gray-500">
                                                            Detalji zadaće
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    renderEmptyState("Nema zadaća", "Ova grupa trenutno nema dodijeljenih zadaća.")
                                )}

                                <h3 className="text-xl font-bold text-gray-200 mb-4 mt-5">Članovi</h3>

                                <div className="flex gap-2 mb-5">
                                    <button 
                                        onClick={() => {setAddStudentToGroupModalOpen(true); handleGetAvailableStudents();}} 
                                        className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Dodaj
                                    </button>

                                    <button 
                                        onClick={() => setRemoveStudentFromGroupModalOpen(true)} 
                                        className="bg-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Ukloni
                                    </button>
                                </div>

                                {groupMembers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-5">
                                        {groupMembers.map((m) => {
                                            const initials = `${m.first_name?.charAt(0) || ""}${m.last_name?.charAt(0) || ""}`.toUpperCase();

                                            return (
                                                <div key={m.id} className="flex flex-col bg-gray-700 p-5 rounded-2xl shadow-lg border border-gray-600 hover:border-gray-400 hover:shadow-xl transition-all group">
                                                    
                                                    <div className="flex items-center gap-4 mb-5">
                                                        <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-gray-300 font-bold text-lg transition-colors shrink-0">
                                                            {initials || <User01/>}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-lg font-bold text-white truncate transition-colors">
                                                                {m.first_name} {m.last_name}
                                                            </h3>
                                                            <p className="text-sm text-gray-400 truncate" title={m.email}>
                                                                {m.email}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-4 border-t border-gray-600 mt-auto">
                                                        <span className="bg-blue-900/40 text-blue-400 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                            {m.expertise_level || "NEMA RAZINE"}
                                                        </span>
                                                        
                                                        <span className="flex items-center gap-1.5 text-sm font-bold text-orange-400 bg-orange-900/20 px-2 py-1 rounded-lg">
                                                            <Star01 className="w-4" /> {m.xp_points || 0} XP
                                                        </span>
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    renderEmptyState("Nema članova", "Ova grupa trenutno nema članova.")
                                )}
                            </div>
                        ) : (
                            <>
                            <div className="flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Moje grupe</h2>
                                    <p className="text-sm text-gray-400 mt-1">Upravljajte svojim grupama i pratite studente</p>
                                </div>
                                <button 
                                    onClick={() => setCreateGroupModalOpen(true)} 
                                    className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                >
                                    Nova grupa
                                </button>
                            </div>
                            {teacherGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {teacherGroups.map((g) => (
                                        <div key={g.id} className="flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 hover:shadow-xl transition-all group">

                                            <div className="flex justify-between items-start p-4 bg-gray-700/50 border-b border-gray-600">
                                                <span className="bg-gray-800 text-xs font-semibold px-2 py-1 rounded-md text-gray-300 truncate max-w-[65%]">
                                                    {g.institution_name || "Nepoznata ustanova"}
                                                </span>
                                                <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-2 py-1 rounded-md">
                                                    {g.academic_year}
                                                </span>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white mb-4 transition-colors">
                                                        {g.name}
                                                    </h3>
                                                    <div className="text-sm text-gray-400 space-y-2">
                                                        <p className="flex items-center gap-2 bg-gray-800/50 w-fit px-3 py-1.5 rounded-lg border border-gray-600/50">
                                                            <Users01 className="w-5 text-orange-500"/> 
                                                            <span className="text-gray-200 font-medium">{g.student_count} {getStudentWord(g.student_count)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <button onClick={() => handleViewGroup(g)} className="w-full mt-6 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border border-gray-500">
                                                    Upravljaj grupom
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                renderEmptyState("Nemate kreiranih grupa", "Kliknite na \"Nova grupa\" kako biste započeli s radom.")
                            )}                            
                            </>
                        )}
                    </div>
                )}

                {menuTab === "assignments" && (
                    <div>
                        {assignmentCreatorOpen ? (
                            <div className="mt-5">
                                <button 
                                    onClick={() => setAssignmentCreatorOpen(false)}
                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit font-medium cursor-pointer"
                                >
                                    <span>&larr;</span> Natrag na popis zadaća
                                </button>
                                <AssignmentCreator 
                                    onClose={() => setAssignmentCreatorOpen(false)} 
                                    onSuccess={async () => {
                                        setAssignmentCreatorOpen(false);
                                        const res = await fetch(`${backendURL}/assignments/dashboard`, { headers: { "Authorization": `Bearer ${token}` } });
                                        if (res.ok) setTeacherAssignments(await res.json());
                                    }} 
                                />
                            </div>
                        ) : (
                            selectedAssignmentFullDetails ? 
                            <div className="flex flex-col animate-fadeIn mt-5">
                                <button 
                                    onClick={() => setSelectedAssignmentFullDetails(null)}
                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit font-medium cursor-pointer"
                                >
                                    <span>&larr;</span> Natrag na popis zadaća
                                </button>
                                
                                <div className="flex justify-between items-center bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-md mb-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-3">{selectedAssignmentFullDetails.title}</h2>
        
                                        <div className="flex flex-col gap-2">
                                            <span><strong>Upute:</strong> {selectedAssignmentFullDetails.instructions}</span>
                                            <span><strong>Tip:</strong> {selectedAssignmentFullDetails.type === "practice" ? "Vježba" : selectedAssignmentFullDetails.type === "practice-exam" ? "Probni ispit" : "Ispit"}</span>
                                        </div>
                                    </div>

                                    {selectedAssignmentFullDetails.assigned_groups.length === 0 && 
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingAssignmentModalOpen(true); 
                                                    setEditAssignmentFormData({title: selectedAssignmentFullDetails.title, instructions: selectedAssignmentFullDetails.instructions, case_sequence: selectedAssignmentFullDetails.cases.map(c => c.id)});
                                                }} 
                                                className="bg-gray-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                            >
                                                <Edit01 className="w-6" />
                                            </button>
                                            <button 
                                                onClick={() => setAssignmentSettingsModalOpen(true)} 
                                                className="bg-gray-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                            >
                                                <Settings01 className="w-6" />
                                            </button>
                                        </div>
                                    }
                                    
                                </div>

                                <h3 className="text-xl font-bold text-gray-200 mb-4">Grupe kojima je dodijeljena zadaća</h3>

                                <div className="flex gap-2 mb-5">
                                    <button 
                                        onClick={() => setAssigningToGroupsModalOpen(true)} 
                                        className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Dodijeli
                                    </button>
                                </div>                                                                
                                
                                {selectedAssignmentFullDetails.assigned_groups.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {selectedAssignmentFullDetails.assigned_groups.map((g) => (
                                            <div key={g.group_id} className="flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group">
                                                <div className="p-5 flex-1 flex flex-col justify-between">
                                                    <h4 className="text-lg font-bold text-white mb-4">{g.group_name}</h4>
                                                    <div className="border-b border-gray-600 mb-2"></div>
                                                    <div className="mt-auto">
                                                        {g.available_until ? (
                                                            <span className="text-xs font-medium inline-block px-2.5 py-1.5 rounded-lg bg-gray-900/40 text-gray-300 border border-gray-800/50">
                                                                Rok: {new Date(g.available_until).toLocaleString('hr-HR', { 
                                                                    day: 'numeric', month: 'numeric', year: 'numeric', 
                                                                    hour: '2-digit', minute: '2-digit' 
                                                                })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-medium inline-block px-2.5 py-1.5 rounded-lg bg-green-900/40 text-green-400 border border-green-800/50">
                                                                Rok: Nema ograničenja
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => {setGroupsToUnassign([...groupsToUnassign, g.group_id]); setUnassigningFromGroupsModalOpen(true)}} 
                                                        className="mt-5 bg-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                                    >
                                                        Ukloni
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    renderEmptyState("Nema grupa", "Ova zadaća trenutno nije dodijeljena nijednoj grupi.")
                                )}

                                <h3 className="text-xl font-bold text-gray-200 my-4">Slučajevi u zadaći</h3>

                                {selectedAssignmentFullDetails.assigned_groups.length === 0 && !removingCasesFromAssignment && !addingCasesToAssignment &&
                                    <div className="flex gap-2 mb-5">
                                        <button 
                                            onClick={() => {setAddingCasesToAssignment(true); handleGetAvailableCases();}} 
                                            className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            Dodaj
                                        </button>

                                        <button 
                                            onClick={() => setRemovingCaseFromAssignment(true)} 
                                            className="bg-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            Ukloni
                                        </button>
                                    </div>
                                }

                                {removingCasesFromAssignment && 
                                    <div>
                                        <p>Odaberite slučajeve koje želite ukloniti.</p>
                                        <div className="flex gap-2 my-5">
                                            <button 
                                                onClick={() => setRemovingCaseFromAssignment(false)} 
                                                className="bg-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                            >
                                                Odustani
                                            </button>
                                            <button 
                                                onClick={handleRemoveCasesFromAssignment} 
                                                className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                            >
                                                Potvrdi
                                            </button>
                                        </div>
                                    </div>
                                }

                                {addingCasesToAssignment && 
                                    <>
                                        <p>Odaberite slučajeve koje želite dodati.</p>
                                        {previewCases.length > 0 ? <div className="my-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {previewCases.map((c) => (
                                                <div 
                                                    key={c.id} 
                                                    onClick={() => toggleCaseToAdd(c.id)} 
                                                    className={`${casesToAddIds.includes(c.id) && "bg-green-700/30 border-green-800"} hover:cursor-pointer relative flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group`}>

                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <h4 className="text-lg font-bold text-white mb-1 pr-8 leading-tight">{c.title}</h4>
                                                        <p className="text-sm text-gray-400">TEMA: {c.topic_name}</p>
                                                        <p className="text-sm text-gray-200 mb-5">DIJAGNOZA: {c.correct_diagnosis}</p>
                                                        
                                                        <div className="mt-auto flex flex-wrap gap-2">
                                                            <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-2 py-1 rounded-md border border-orange-800/50">
                                                                Razina: {c.level}
                                                            </span>
                                                            
                                                            {c.status && (
                                                                <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-2 py-1 rounded-md border border-orange-800/50 uppercase tracking-wider">
                                                                    {c.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    
                                        </div> : renderEmptyState("Nema slučajeva", "Trenutno nema slučajeva koje je moguće dodati u ovu zadaću.")}
                                        
                                        <div>
                                            <div className="flex gap-2 mb-5">
                                                <button 
                                                    onClick={() => setAddingCasesToAssignment(false)} 
                                                    className="bg-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                                >
                                                    Odustani
                                                </button>
                                                <button 
                                                    onClick={handleAddCasesToAssignment} 
                                                    className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                                >
                                                    Potvrdi
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                }

                                {selectedAssignmentFullDetails.cases.length > 0 ? (
                                    <div className="mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {selectedAssignmentFullDetails.cases.map((c) => (
                                            <div 
                                                key={c.id} 
                                                onClick={removingCasesFromAssignment ? () => toggleCaseToRemove(c.id) : undefined} 
                                                className={`${removingCasesFromAssignment && "hover:cursor-pointer"} ${(removingCasesFromAssignment && casesToRemoveIds.includes(c.id)) && "bg-red-700/30 border-red-800"} relative flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group`}>
                                                
                                                <div className="absolute top-4 right-4">
                                                    <span className="bg-gray-800 text-gray-400 text-xs font-bold px-2 py-1 rounded-md border border-gray-600 shadow-sm">
                                                        {c.sequence_no}
                                                    </span>
                                                </div>

                                                <div className="p-5 flex-1 flex flex-col">
                                                    <h4 className="text-lg font-bold text-white mb-1 pr-8 leading-tight">{c.title}</h4>
                                                    <p className="text-sm text-gray-400 mb-5">{c.topic_name || "Općenito"}</p>
                                                    
                                                    <div className="mt-auto flex flex-wrap gap-2">
                                                        <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-2 py-1 rounded-md border border-orange-800/50">
                                                            Razina: {c.level}
                                                        </span>
                                                        
                                                        <span className="bg-gray-800 text-gray-400 text-xs font-bold px-2 py-1 rounded-md border border-gray-600">
                                                            v{c.version}
                                                        </span>
                                                        
                                                        {c.status && (
                                                            <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-2 py-1 rounded-md border border-orange-800/50 uppercase tracking-wider">
                                                                {c.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    renderEmptyState("Nema slučajeva", "Ovoj zadaći trenutno nije dodijeljen nijedan slučaj.")
                                )}
                            </div> 
                            : 
                            <div className="mt-5">
                                <div className="flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Zadaće</h2>
                                        <p className="text-sm text-gray-400 mt-1">Upravljajte svojim zadaćama</p>
                                    </div>
                                    <button 
                                        onClick={() => setAssignmentCreatorOpen(true)} 
                                        className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Nova zadaća
                                    </button>
                                </div>

                                <div className="w-fit my-5 flex bg-gray-700 p-1 rounded-lg border border-gray-600">
                                    <button 
                                        onClick={() => setAssignmentFilter("active")}
                                        className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${assignmentFilter === "active" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                                    > Aktivne </button>
                                    <button 
                                        onClick={() => setAssignmentFilter("archived")}
                                        className={`hover:cursor-pointer px-4 py-1.5 rounded-md text-sm transition ${assignmentFilter === "archived" ? "bg-gray-600 text-white shadow" : "text-gray-400"}`}
                                    > Arhiva </button>
                                </div>

                                {assignmentFilter === "archived" ? 
                                    <div>
                                        {archivedTeacherAssignments.length > 0 ? 
                                        <div>
                                            {archivedTeacherAssignments.map((aa) => (
                                                <div key={aa.id}>
                                                    {aa.title}
                                                    <button onClick={() => handleUnarchiveAssignment(aa.id)}>Vrati zadaću</button>
                                                </div>
                                            ))}
                                        </div> : renderEmptyState("Nema zadaća" , "Trenutno nemate arhiviranih zadaća.")}
                                        
                                    </div>
                                    : 
                                    <div>
                                        {teacherAssignments.length > 0 ? 
                                        <div className="my-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {teacherAssignments.map((a) => {
                                                const typeLabel = a.type === "practice" ? "Vježba" : a.type === "practice_exam" ? "Probni ispit" : "Ispit";

                                                return (
                                                <div key={a.id} className="relative flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group">
                                                    <Dropdown
                                                        onArchive={() => {
                                                            setAssignmentToArchiveId(a.id);
                                                            setAssignmentArchiveModalOpen(true);
                                                        }}
                                                    />
                                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-white mb-2">{a.title}</h3>
                                                            <p>{typeLabel}</p>
                                                        </div>
                                                        <button onClick={() => handleViewAssignment(a.id)} className="w-full mt-5 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 px-2 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer border border-gray-500">
                                                            Detalji zadaće
                                                        </button>
                                                    </div>
                                                </div>
                                            )})}
                                        </div> : renderEmptyState("Nema zadaća", "Trenutno nemate aktivnih zadaća.")}
                                    </div>
                                }
                            </div>
                        )}
                    </div>
                )}
            </main>
            
            <Modal isOpen={caseArchiveModalOpen} onClose={() => setCaseArchiveModalOpen(false)} title="Arhivirati slučaj?">
                <div className="flex justify-center w-full">
                    <button onClick={() => handleArchiveCase(caseToArchiveId)} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>

            <Modal isOpen={assignmentArchiveModalOpen} onClose={() => setAssignmentArchiveModalOpen(false)} title="Arhivirati zadaću?">
                <div className="flex justify-center w-full">
                    <button onClick={() => handleArchiveAssignment(assignmentToArchiveId)} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>

            <Modal isOpen={unassigningFromGroupsModalOpen} onClose={() => setUnassigningFromGroupsModalOpen(false)} title="Ukloniti zadaću iz grupe?">
                <div className="flex justify-center w-full">
                    <button onClick={handleUnassignFromGroup} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>

            <Modal isOpen={createGroupModalOpen} onClose={() => setCreateGroupModalOpen(false)} title="Nova grupa">
                <div className="flex flex-col w-full gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">Naziv grupe</label>
                        <input 
                            type="text" 
                            placeholder="npr. Anatomija 1" 
                            name="name"
                            value={formData.name} 
                            onChange={handleChange} 
                            className="w-full p-2.5 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-gray-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">Akademska godina</label>
                        <select 
                            name="academic_year"
                            value={formData.academic_year} 
                            onChange={handleChange}
                            className="w-full p-2.5 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="" disabled>Odaberite akademsku godinu...</option>
                            <option value="2025/2026">2025/2026</option>
                            <option value="2026/2027">2026/2027</option>
                            <option value="2027/2028">2027/2028</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleCreateGroup} 
                        disabled={!formData.name || !formData.academic_year}
                        className="mt-2 w-full cursor-pointer bg-orange-500 text-white font-bold px-4 py-3 rounded-lg transition-colors disabled:bg-gray-400/50 disabled:text-gray-500/70 disabled:cursor-not-allowed shadow-md"
                    >
                        Kreiraj grupu
                    </button>
                </div>
            </Modal>

            <Modal isOpen={addStudentToGroupModalOpen} 
                onClose={() => { 
                    setAddStudentToGroupModalOpen(false); 
                    setSelectedStudents([]);
                }} 
                title="Dodaj članove"
            >
                <div className="flex flex-col h-[50vh] w-full">
                    <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                        
                        {/* LIJEVI STUPAC: Dostupni studenti */}
                        <div className="col-span-1 flex flex-col rounded-xl border border-gray-300 overflow-hidden">
                            <div className="p-3 bg-orange-200 text-xs uppercase tracking-wider font-bold text-gray-800">
                                Dostupni studenti ({students.length})
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {students.length === 0 && (
                                    <p className="text-gray-500 text-sm p-4 text-center">Nema dostupnih studenata.</p>
                                )}
                                
                                {students.map((s) => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleSelectStudent(s)} 
                                        className="p-2 rounded-lg shadow-md bg-gray-100 hover:bg-gray-200 border border-transparent cursor-pointer flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                                            {s.first_name?.charAt(0).toUpperCase() || ""}{s.last_name?.charAt(0).toUpperCase() || ""}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-700 truncate">{s.first_name} {s.last_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DESNI STUPAC: Odabrani studenti */}
                        <div className="col-span-1 flex flex-col rounded-xl border border-gray-300 overflow-hidden">
                            <div className="p-3 bg-orange-200 text-xs uppercase tracking-wider font-bold text-gray-800">
                                Odabrani za dodavanje ({selectedStudents.length})
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {selectedStudents.length === 0 && (
                                    <p className="text-gray-500 text-sm p-4 text-center">Kliknite na studenta u lijevom stupcu za odabir.</p>
                                )}
                                
                                {selectedStudents.map((s) => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleDeselectStudent(s)} 
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 shadow-md border cursor-pointer flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                                            {s.first_name?.charAt(0).toUpperCase() || ""}{s.last_name?.charAt(0).toUpperCase() || ""}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-700 truncate">{s.first_name} {s.last_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Donja traka s akcijama */}
                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => { setAddStudentToGroupModalOpen(false); setSelectedStudents([]); }} 
                            className="px-4 py-2 rounded-lg font-bold bg-red-500 transition-colors cursor-pointer"
                        >
                            Odustani
                        </button>
                        <button 
                            onClick={handleAddStudentsToGroup} 
                            disabled={selectedStudents.length === 0} 
                            className="px-6 py-2 rounded-lg font-bold bg-orange-500 text-white hover:cursor-pointer disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
                        >
                            Potvrdi ({selectedStudents.length})
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal 
                isOpen={removeStudentFromGroupModalOpen} 
                onClose={() => { 
                    setRemoveStudentFromGroupModalOpen(false); 
                    setStudentsToRemove([]);
                }} 
                title="Ukloni članove"
            >
                <div className="flex flex-col h-[50vh] w-full">
                    <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                        
                        {/* LIJEVI STUPAC: Trenutni članovi */}
                        <div className="col-span-1 flex flex-col rounded-xl border border-gray-300 overflow-hidden">
                            <div className="p-3 bg-orange-200 text-xs uppercase tracking-wider font-bold text-gray-800">
                                Članovi ({groupMembers.length})
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {groupMembers.length === 0 && (
                                    <p className="text-gray-500 text-sm p-4 text-center">Nema članova.</p>
                                )}
                                
                                {groupMembers.map((m) => (
                                    <div 
                                        key={m.id} 
                                        onClick={() => handleStageForRemoval(m)} 
                                        className="p-2 rounded-lg shadow-md bg-gray-100 hover:bg-gray-200 border border-transparent cursor-pointer flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                                            {m.first_name?.charAt(0).toUpperCase() || ""}{m.last_name?.charAt(0).toUpperCase() || ""}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-700 truncate">{m.first_name} {m.last_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DESNI STUPAC: Odabrani studenti */}
                        <div className="col-span-1 flex flex-col rounded-xl border border-gray-300 overflow-hidden">
                            <div className="p-3 bg-orange-200 text-xs uppercase tracking-wider font-bold text-gray-800">
                                Odabrani za uklanjanje ({studentsToRemove.length})
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {studentsToRemove.length === 0 && (
                                    <p className="text-gray-500 text-sm p-4 text-center">Kliknite na studenta u lijevom stupcu za odabir.</p>
                                )}
                                
                                {studentsToRemove.map((s) => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleUnstageForRemoval(s)} 
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 shadow-md border cursor-pointer flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                                            {s.first_name?.charAt(0).toUpperCase() || ""}{s.last_name?.charAt(0).toUpperCase() || ""}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-700 truncate">{s.first_name} {s.last_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{s.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Donja traka s akcijama */}
                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => { setRemoveStudentFromGroupModalOpen(false); setStudentsToRemove([]); }} 
                            className="px-4 py-2 rounded-lg font-bold bg-red-500 transition-colors cursor-pointer"
                        >
                            Odustani
                        </button>
                        <button 
                            onClick={handleRemoveStudentsFromGroup} 
                            disabled={studentsToRemove.length === 0} 
                            className="px-6 py-2 rounded-lg font-bold bg-orange-500 text-white hover:cursor-pointer disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
                        >
                            Potvrdi ({studentsToRemove.length})
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal 
                isOpen={assignmentSettingsModalOpen} 
                onClose={() => {
                    setAssignmentSettingsModalOpen(false);
                    setLocalSettings(null); // Očisti pri zatvaranju
                }} 
                title="Postavke zadaće"
            >
                {localSettings ? (
                    <div className="flex flex-col gap-6 mt-2 w-full items-center">
                        <div className="space-y-4 p-5 rounded-xl w-2/3">
                            {[
                                { key: "case_sequence_lock", label: "Zaključaj redoslijed slučajeva", desc: "Studenti moraju rješavati slučajeve redom." },
                                { key: "enable_LLM_mentor", label: "Omogući AI Mentora", desc: "Dopusti studentima korištenje AI asistenta." },
                                { key: "enable_hints", label: "Omogući Hintove", desc: "Prikazuj gumb za pomoć." },
                                { key: "enable_undo", label: "Omogući Undo", desc: "Dopusti poništavanje zadnjeg poteza." },
                                { key: "ignore_hint_cost", label: "Besplatni hintovi", desc: "Korištenje hintova ne oduzima bodove." },
                                { key: "ignore_terminating_consequences", label: "Ignoriraj fatalne greške", desc: "Spriječi pad na slučaju zbog jedne velike greške." },
                                { key: "show_result_immediately", label: "Prikaži rezultat odmah", desc: "Student vidi ishod čim završi slučaj." }
                            ].map((setting) => (
                                <div key={setting.key} className="flex items-center justify-between">
                                    <div className="pr-4">
                                        <p className="text-sm font-bold text-gray-700">{setting.label}</p>
                                        <p className="text-xs text-gray-400">{setting.desc}</p>
                                    </div>
                                    <div 
                                        onClick={() => handleToggleSetting(setting.key as keyof Settings)}
                                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out shrink-0 ${localSettings[setting.key as keyof Settings] ? 'bg-orange-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${localSettings[setting.key as keyof Settings] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-300 w-2/3">
                            <button 
                                onClick={handleResetSettings}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 bg-gray-200 border border-gray-300 hover:cursor-pointer transition-colors"
                            >
                                Vrati na zadano
                            </button>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setAssignmentSettingsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg font-bold text-white bg-gray-600 hover:cursor-pointer transition-colors"
                                >
                                    Odustani
                                </button>
                                <button 
                                    onClick={handleSaveSettings}
                                    className="px-6 py-2 rounded-lg font-bold text-white bg-green-600 hover:cursor-pointer transition-colors shadow-md"
                                >
                                    Spremi postavke
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-400">Učitavanje postavki...</div>
                )}
            </Modal>

            <Modal isOpen={editingAssignmentModalOpen} onClose={() => setEditingAssignmentModalOpen(false)} title="Uredi zadaću">
                <div className="flex flex-col gap-4 w-full">
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-gray-700 mb-2">Naslov</label>
                            <input 
                                type="text" 
                                name="title" 
                                value={editAssignmentFormData.title} 
                                onChange={handleEditAssignmentInputChange}
                                className="w-full px-2.5 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-gray-400 mb-2"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">Upute</label>
                            <input 
                                type="text" 
                                name="instructions" 
                                value={editAssignmentFormData.instructions}
                                onChange={handleEditAssignmentInputChange}
                                className="w-full px-2.5 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-gray-400"
                            /> 
                        </div>
                    </div>
                      
                    <div>
                        <label className="block font-medium text-gray-700 mb-2">Redoslijed slučajeva</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl border border-gray-400">
                            {localCases.map((c, index) => (
                                <div key={c.id} className="flex items-center justify-between bg-gray-200 p-3 rounded-lg border border-gray-300 group">
                                    <div className="flex items-center gap-3 truncate">
                                        <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded font-mono">#{index + 1}</span>
                                        <span className="text-sm font-medium text-gray-800 truncate">{c.title}</span>
                                    </div>
                                    
                                    <div className="flex gap-1 shrink-0">
                                        <button 
                                            type="button"
                                            onClick={() => handleMoveCaseInModal(index, "up")}
                                            disabled={index === 0}
                                            className="p-1 rounded bg-orange-500 text-white disabled:bg-gray-400 disabled:opacity-50 cursor-pointer disabled:cursor-default text-xs"
                                            title="Pomakni gore"
                                        >
                                            <ArrowNarrowUp />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleMoveCaseInModal(index, "down")}
                                            disabled={index === localCases.length - 1}
                                            className="p-1 rounded bg-orange-500 text-white disabled:bg-gray-400 disabled:opacity-50 cursor-pointer disabled:cursor-default text-xs"
                                            title="Pomakni dolje"
                                        >
                                            <ArrowNarrowDown />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {localCases.length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-2">Nema slučajeva u ovoj zadaći.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-gray-300 mt-2">
                        <button 
                            onClick={() => setEditingAssignmentModalOpen(false)} 
                            className="bg-gray-700 text-gray-200 px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                            Odustani
                        </button>
                        <button 
                            onClick={handleUpdateAssignment} 
                            className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                            Pohrani promjene
                        </button>
                    </div>
                </div>
            </Modal>

            {assignmentDetailsModalOpen && selectedAssignment && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-600 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col items-center shadow-2xl">
                        
                        <div className="flex justify-between items-center p-6 border-b border-gray-700 w-full">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedAssignment.title}</h2>
                            </div>
                            <button onClick={closeAssignmentModal} className="text-gray-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 w-full">
                            {selectedAssignment.instructions && (
                                <div className="mb-8 bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                    <h3 className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-2">Upute za rješavanje</h3>
                                    <p className="text-gray-200">{selectedAssignment.instructions}</p>
                                </div>
                            )}

                            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">Slučajevi u zadaći</h3>

                            <div className="space-y-4">
                                {selectedAssignment.cases.map((c) => (
                                    <div key={c.id} className="flex justify-between items-center bg-gray-700 p-4 rounded-xl border border-gray-600">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded">{c.sequence_no}</span>
                                                <h4 className="font-bold text-white text-lg">{c.title}</h4>
                                            </div>
                                            <div className="flex gap-3 text-sm text-gray-400">
                                                <span>Tema: {c.topic_name || "Općenito"}</span>
                                                <span>•</span>
                                                <span>Level: {c.level}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {selectedAssignment.cases.length === 0 && (
                                    <p className="text-gray-400 italic">Ova zadaća još ne sadrži slučajeve.</p>
                                )}
                            </div>
                        </div>
                        
                        <button onClick={() => {
                            setMenuTab("assignments"); 
                            setAssignmentDetailsModalOpen(false); 
                            setSelectedAssignmentFullDetails(selectedAssignment);
                        }} className="mb-5 px-6 py-2 rounded-lg font-bold bg-orange-500 text-white hover:cursor-pointer transition-colors shadow-md">
                            Upravljaj zadaćom
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={assigningToGroupsModalOpen} 
                onClose={() => {
                    setAssigningToGroupsModalOpen(false);
                    setGroupsToAssign([]);
                }} 
                title="Dodjela zadaće grupama"
            >
                <div className="flex flex-col max-h-[70vh] w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
                        {teacherGroups.map((g) => {
                            const selectedGroup = groupsToAssign.find(item => item.group_id === g.id);
                            const isSelected = !!selectedGroup;

                            return (
                                <div 
                                    key={g.id} 
                                    onClick={() => handleToggleGroupSelection(g.id)}
                                    className={`flex flex-col rounded-2xl shadow-md border overflow-hidden transition-all group cursor-pointer ${
                                        isSelected 
                                            ? "bg-gray-700 border-orange-500 ring-1 ring-orange-500" 
                                            : "bg-gray-800 border-gray-600 hover:border-gray-400"
                                    }`}
                                >
                                    <div className="flex justify-between items-center p-4 border-b border-gray-600/50">
                                        <span className="bg-gray-900/50 text-xs font-semibold px-2 py-1 rounded-md text-gray-300 truncate max-w-[65%]">
                                            {g.institution_name || "Nepoznata ustanova"}
                                        </span>
                                        
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            isSelected ? "bg-orange-500 border-orange-500" : "bg-gray-700 border-gray-500"
                                        }`}>
                                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1">
                                        <h3 className={`text-lg font-bold mb-3 transition-colors ${isSelected ? "text-orange-400" : "text-white"}`}>
                                            {g.name}
                                        </h3>
                                        <div className="flex items-center gap-2 bg-gray-900/40 w-fit px-3 py-1.5 rounded-lg border border-gray-600/30">
                                            <Users01 className={`w-4 ${isSelected ? "text-orange-400" : "text-gray-400"}`}/> 
                                            <span className="text-gray-300 text-sm font-medium">{g.student_count} {getStudentWord(g.student_count)}</span>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div 
                                            className="p-4 bg-gray-900/50 border-t border-gray-600/50 animate-fadeIn"
                                            onClick={(e) => e.stopPropagation()} 
                                        >
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                Rok za rješavanje (Opcionalno)
                                            </label>
                                            <input 
                                                type="datetime-local" 
                                                value={selectedGroup?.available_until || ""}
                                                onChange={(e) => handleGroupDateChange(g.id, e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all cursor-pointer color-scheme-dark"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-gray-700 flex justify-end gap-3 shrink-0 mt-2">
                        <button 
                            onClick={() => {
                                setAssigningToGroupsModalOpen(false);
                                setGroupsToAssign([]);
                            }} 
                            className="px-4 py-2 rounded-lg font-bold bg-gray-600 text-white hover:bg-gray-500 transition-colors cursor-pointer"
                        >
                            Odustani
                        </button>
                        <button 
                            onClick={handleAssignToGroup}
                            disabled={groupsToAssign.length === 0} 
                            className="px-6 py-2 rounded-lg font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-md cursor-pointer"
                        >
                            Dodijeli zadaću ({groupsToAssign.length})
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TeacherDashboard;

import { useEffect, useState } from "react";
import { Modal } from "../UI/Modal";
import { useAuthStore } from "../../store/useAuthStore";
import { AssignmentCreator } from "./AssignmentCreator";
import { ArrowNarrowDown, ArrowNarrowUp, Check, Edit01, Settings01, Users01 } from "@untitledui/icons";
import { Dropdown } from "../UI/Dropdown";
import { useTeacherStore, type Assignment } from "../../store/useTeacherDashStore";

interface GroupToAssign {
    group_id: string;
    available_until: string;
}

interface EditAssignmentFormData {
    title: string;
    instructions: string;
    case_sequence?: string[];
}

interface Case {
    id: string;
    title: string;
    level: string;
    topic_name: string;
    version: number;
    status?: string;
    type?: string;
    correct_diagnosis?: string; 
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
    ignore_hint_penalty: boolean;
    enable_LLM_mentor: boolean;
    case_sequence_lock: boolean;
    randomly_choose_cases: boolean;
    show_result_immediately: boolean;
    ignore_terminating_consequences: boolean;
    random_case_picker_settings?: {
        no_of_cases: number;
        case_level: string | null;
        category_id: string | null;
    } | null;
}

interface Category {
    id: string;
    name: string;
    parent_id: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function AssignmentMgmt() {
    const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
    const [archivedTeacherAssignments, setArchivedTeacherAssignments] = useState<Assignment[]>([]);
    const [assignmentCreatorOpen, setAssignmentCreatorOpen] = useState<boolean>(false);
    const [assignmentSettingsModalOpen, setAssignmentSettingsModalOpen] = useState<boolean>(false);
    
    const [editingAssignmentModalOpen, setEditingAssignmentModalOpen] = useState<boolean>(false);
    const [localCases, setLocalCases] = useState<AssignmentCaseDetail[]>([]);
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

    const [categories, setCategories] = useState<Category[]>();

    const [localSettings, setLocalSettings] = useState<Settings | null>(null);
    const [randomCount, setRandomCount] = useState(1);
    const [randomLevel, setRandomLevel] = useState("");
    const [randomTopic, setRandomTopic] = useState("");
    
    const token = useAuthStore((state) => state.token);
    const { 
        teacherGroups,  
        selectedGroup,  
        handleViewGroup, 
        selectedAssignmentFullDetails, setSelectedAssignmentFullDetails,
        hasFetchedGroups, fetchTeacherGroups
    } = useTeacherStore();

    useEffect(() => {
        if (editingAssignmentModalOpen && selectedAssignmentFullDetails?.cases) {
            setLocalCases([...selectedAssignmentFullDetails.cases].sort((a, b) => a.sequence_no - b.sequence_no));
        }
    }, [editingAssignmentModalOpen, selectedAssignmentFullDetails]);

    useEffect(() => {
        if (assignmentSettingsModalOpen && selectedAssignmentFullDetails?.settings) {
            setLocalSettings(JSON.parse(JSON.stringify(selectedAssignmentFullDetails.settings)));

            const pickerSettings = selectedAssignmentFullDetails.settings.random_case_picker_settings;
            if (pickerSettings) {
                setRandomCount(pickerSettings.no_of_cases || 1);
                setRandomLevel(pickerSettings.case_level || "");
                setRandomTopic(pickerSettings.category_id || "");
            } else {
                setRandomCount(1);
                setRandomLevel("");
                setRandomTopic("");
            }
        }
    }, [assignmentSettingsModalOpen, selectedAssignmentFullDetails]);
    
    useEffect(() => {
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

        fetchAssignments();        

        if (!hasFetchedGroups) {
            fetchTeacherGroups();
        }

    }, [token, fetchTeacherGroups, hasFetchedGroups]);


    // HANDLERS
    const handleViewAssignment = async (assignmentId: string) => {
        try {
            const res = await fetch(`${backendURL}/assignments/${assignmentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedAssignmentFullDetails(data);                
            } else {
                alert("Greška pri dohvaćanju detalja zadaće.");
            }

            const categoryRes = await fetch(`${backendURL}/categories`, { 
                headers: { "Authorization": `Bearer ${token}` } 
            });

            if (categoryRes.ok) {
                setCategories(await categoryRes.json());
            } else {
                alert("Greška pri dohvaćanju tema.");
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

            const pickerSettings = selectedAssignmentFullDetails.settings.random_case_picker_settings;
            setRandomCount(pickerSettings?.no_of_cases || 1);
            setRandomLevel(pickerSettings?.case_level || "");
            setRandomTopic(pickerSettings?.category_id || "");
        }
    };

    const handleSaveSettings = async () => {
        if (!localSettings) return;

        const updatedSettings = {
            ...localSettings,
            random_case_picker_settings: localSettings.randomly_choose_cases ? {
                no_of_cases: randomCount,
                case_level: randomLevel || null,
                category_id: randomTopic || null
            } : null
        };

        try {
            const res = await fetch(`${backendURL}/assignments/${selectedAssignmentFullDetails?.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ settings: updatedSettings }) 
            });

            if (res.ok) {
                if (selectedAssignmentFullDetails) {
                    setSelectedAssignmentFullDetails({
                        ...selectedAssignmentFullDetails,
                        settings: localSettings
                    });
                    await handleViewAssignment(selectedAssignmentFullDetails.id);
                }
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


    const handleEditAssignmentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        setEditAssignmentFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
    };

    const handleEditAssignment = async () => {
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
                if (selectedAssignmentFullDetails) {
                    const remainingCases = selectedAssignmentFullDetails.cases.filter(
                        c => !casesToRemoveIds.includes(c.id)
                    );

                    const resequencedCases = remainingCases.map((c, index) => ({
                        ...c,
                        sequence_no: index + 1
                    }));

                    setSelectedAssignmentFullDetails({
                        ...selectedAssignmentFullDetails,
                        cases: resequencedCases
                    });
                }

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

    // (UN)ARCHIVE
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

    // UI HELPERS
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

    return (
        <>
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
                            onClick={() => {setSelectedAssignmentFullDetails(null); setAddingCasesToAssignment(false);}}
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
                                            <div className="mt-3">
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
                                                className="mt-5 bg-gray-600 border border-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
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

                        {selectedAssignmentFullDetails.settings?.randomly_choose_cases ? (
                            <div className="bg-gray-700/30 p-6 rounded-2xl border border-dashed border-gray-500/50 my-6">
                                <h3 className="text-lg font-bold text-orange-400 mb-2">Nasumični odabir slučajeva je uključen</h3>
                                <p className="text-sm text-gray-300 mb-4">
                                    Slučajevi se automatski i jedinstveno generiraju za svakog studenta pri njegovom prvom pokretanju ove zadaće prema sljedećim pravilima:
                                </p>
                                <ul className="space-y-3 text-sm text-gray-200 bg-gray-800 p-4 rounded-xl border border-gray-600">
                                    <li className="flex items-center">
                                        <p className="text-gray-400">Broj slučajeva po studentu: 
                                            <span className="text-gray-50 font-bold"> {selectedAssignmentFullDetails.settings.random_case_picker_settings?.no_of_cases || "Nije definirano"}
                                            </span>
                                        </p> 
                                        
                                    </li>
                                    <li className="flex items-center">
                                        <p className="text-gray-400">Razina: 
                                            <span className="text-gray-50 font-bold"> {selectedAssignmentFullDetails.settings.random_case_picker_settings?.case_level === 'novice' ? 'Početna' : 
                                                selectedAssignmentFullDetails.settings.random_case_picker_settings?.case_level === 'intermediate' ? 'Srednja' : 
                                                selectedAssignmentFullDetails.settings.random_case_picker_settings?.case_level === 'expert' ? 'Napredna' : 
                                                'Bilo koja razina'}
                                            </span>
                                        </p> 
                                    </li>
                                    <li className="flex items-center">
                                        <p className="text-gray-400">Tema: 
                                            <span className="text-gray-50 font-bold"> {selectedAssignmentFullDetails.settings.random_case_picker_settings?.category_id 
                                                    ? categories?.find(c => c.id === selectedAssignmentFullDetails.settings.random_case_picker_settings?.category_id)?.name || "Nepoznata tema"
                                                    : "Sve teme"
                                                }
                                            </span>
                                        </p> 
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <>
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
                                                                Razina: {c.level === "novice" ? "početna" : c.level === "intermediate" ? "srednja" : "napredna"}
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
                                                            Razina: {c.level === "novice" ? "početna" : c.level === "intermediate" ? "srednja" : "napredna"}
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
                            </>
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
                                <div className="my-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {archivedTeacherAssignments.map((aa) => {
                                        const typeLabel = aa.type === "practice" ? "Slobodna vježba" : aa.type === "practice_exam" ? "Simulacija ispita" : "Ispit";

                                        return(
                                            <div key={aa.id} className="relative flex flex-col bg-gray-600 rounded-xl border border-gray-700 p-5 shadow-lg group">
                                                <div className="mt-4 flex-1">
                                                    <h3 className="text-lg font-bold text-white leading-tight">{aa.title}</h3>
                                                    <p className="text-sm text-gray-300 mt-1">{typeLabel}</p>
                                                </div>

                                                <button onClick={() => handleUnarchiveAssignment(aa.id)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-lg hover:cursor-pointer transition shadow-md">
                                                    Vrati zadaću
                                                </button>                                              
                                            </div>
                                        )
                                    })}
                                </div> : renderEmptyState("Nema zadaća" , "Trenutno nemate arhiviranih zadaća.")}
                                
                            </div>
                            : 
                            <div>
                                {teacherAssignments.length > 0 ? 
                                <div className="my-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {teacherAssignments.map((a) => {
                                        const typeLabel = a.type === "practice" ? "Slobodna vježba" : a.type === "practice_exam" ? "Simulacija ispita" : "Ispit";

                                        return (
                                            <div key={a.id} className="relative flex flex-col bg-gray-600 rounded-xl border border-gray-700 p-5 shadow-lg group">
                                                <Dropdown
                                                    onArchive={() => {
                                                        setAssignmentToArchiveId(a.id);
                                                        setAssignmentArchiveModalOpen(true);
                                                    }}
                                                />

                                                <div className="mt-4 flex-1">
                                                    <h3 className="text-lg font-bold text-white leading-tight">{a.title}</h3>
                                                    <p className="text-sm text-gray-300 mt-1">{typeLabel}</p>
                                                </div>

                                                <button onClick={() => handleViewAssignment(a.id)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-lg hover:cursor-pointer shadow-md">
                                                    Detalji zadaće
                                                </button>                                                
                                            </div>
                                    )})}
                                </div> : renderEmptyState("Nema zadaća", "Trenutno nemate aktivnih zadaća.")}
                            </div>
                        }
                    </div>
                )}
            </div>

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

            <Modal 
                isOpen={assignmentSettingsModalOpen} 
                onClose={() => {
                    setAssignmentSettingsModalOpen(false);
                    setLocalSettings(null);
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
                                { key: "ignore_hint_penalty", label: "Hintovi bez kazni", desc: "Korištenje hintova ne utječe na ocjenu za samostalnost." },
                                { key: "ignore_terminating_consequences", label: "Ignoriraj fatalne greške", desc: "Spriječi pad na slučaju zbog jedne velike greške." },
                                { key: "show_result_immediately", label: "Prikaži rezultat odmah", desc: "Student vidi ishod čim završi slučaj." },
                                { key: "allow_diagnosis_retry", label: "Dozvoljeni ponovni pokušaji dijagnoze", desc: "Studentima je dozvoljeno ponoviti pokušaj dijagnoze proizvoljan broj puta" },
                                { key: "penalize_wrong_diagnosis", label: "Kazna za pogrešne pokušaje dijagnoze", desc: "Pogrešne dijagnoze se kažnjavaju" }
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

                        <div className="bg-gray-200 p-4 rounded-xl border border-gray-400 w-2/3">
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Broj slučajeva</label>
                                    <input type="number" min="1" max="20" placeholder="npr. 1" value={randomCount === 0 ? "" : randomCount} onChange={(e) => setRandomCount(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-3 py-1.5 bg-gray-100 border border-gray-400 text-gray-700 rounded text-sm outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Razina</label>
                                    <select value={randomLevel} onChange={(e) => setRandomLevel(e.target.value)} className="w-full px-3 py-1.5 bg-gray-100 border border-gray-400 text-gray-700 rounded text-sm outline-none">
                                        <option value="">Bilo koja</option>
                                        <option value="novice">Početna</option>
                                        <option value="intermediate">Srednja</option>
                                        <option value="expert">Napredna</option>
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Tema</label>
                                    <select value={randomTopic} onChange={(e) => setRandomTopic(e.target.value)} className="w-full px-3 py-1.5 bg-gray-100 border border-gray-400 text-gray-700 rounded text-sm outline-none cursor-pointer">
                                        <option value="">Sve teme</option>
                                        {categories?.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
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
                            onClick={handleEditAssignment} 
                            className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                            Pohrani promjene
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={assigningToGroupsModalOpen} 
                onClose={() => {
                    setAssigningToGroupsModalOpen(false);
                    setGroupsToAssign([]);
                }} 
                title="Dodjela zadaće grupama"
            >
                <div className="flex flex-col max-h-[70vh] w-full">
                    {teacherGroups.filter(g => !selectedAssignmentFullDetails?.assigned_groups.some(ag => ag.group_id === g.id)).length > 0 ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
                        {teacherGroups.map((g) => {
                            const selectedGroup = groupsToAssign.find(item => item.group_id === g.id);
                            const isSelected = !!selectedGroup;

                            return (
                                <div 
                                    key={g.id} 
                                    onClick={() => handleToggleGroupSelection(g.id)}
                                    className={`m-1 flex flex-col rounded-2xl shadow-md border overflow-hidden transition-all group cursor-pointer ${
                                        isSelected 
                                            ? "bg-gray-200 ring-2 ring-orange-500" 
                                            : "bg-gray-200 border-gray-400"
                                    }`}
                                >
                                    <div className="flex justify-between items-center p-4 border-b border-gray-600/50">
                                        <span className="bg-orange-400/30 text-xs font-semibold px-2 py-1 rounded-md text-gray-800 truncate max-w-[65%]">
                                            {g.institution_name || "Nepoznata ustanova"}
                                        </span>
                                        
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            isSelected ? "bg-orange-500 border-orange-500" : "bg-gray-400 border-gray-500"
                                        }`}>
                                            {isSelected && <Check className="w-5" />}
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1">
                                        <h3 className={`text-lg font-bold mb-3 transition-colors text-gray-800`}>
                                            {g.name}
                                        </h3>
                                        <div className="flex items-center gap-2 bg-gray-300 w-fit px-3 py-1.5 rounded-lg border border-gray-600/30">
                                            <Users01 className={`w-4 ${isSelected ? "text-orange-400" : "text-gray-900"}`}/> 
                                            <span className="text-gray-900 text-sm font-medium">{g.student_count} {getStudentWord(g.student_count)}</span>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div 
                                            className="p-4 bg-gray-300/50 border-t border-gray-600/50 animate-fadeIn"
                                            onClick={(e) => e.stopPropagation()} 
                                        >
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Rok za rješavanje (Opcionalno)
                                            </label>
                                            <input 
                                                type="datetime-local" 
                                                value={selectedGroup?.available_until || ""}
                                                onChange={(e) => handleGroupDateChange(g.id, e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-200 border border-gray-400 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all cursor-pointer color-scheme-dark"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    ) : 
                    (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                            <p className="font-bold text-lg mb-1">Nema dostupnih grupa</p>
                            <p className="text-sm">Ova zadaća je već dodijeljena svim vašim grupama.</p>
                        </div>
                    )}

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
        </>
    );
}

export default AssignmentMgmt;
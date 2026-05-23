import { useNavigate } from "react-router-dom";
import { Modal } from "../UI/Modal";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useCaseSolvingStore } from "../../store/useCaseSolveStore";
import { useCaseStore, type DiagnosticUnit } from "../../store/useCaseStore";
import { Dropdown } from "../UI/Dropdown";
import { Star01, User01, Users01, Calendar, GraduationHat02 } from "@untitledui/icons";

interface Case {
    id: string;
    title: string;
    version: number;
    level: number;
    topic_name: string;
    status?: string;
    type?: string;
}

interface Group {
    id: string;
    name: string;
    academic_year: string;
    teacher_name: string;
    institution_name: string;
    student_count: number;
}

interface Assignment {
    id: string;
    title: string;
    type: string;
    instructions: string;
    group_name?: string;
    available_until: string;
}

interface User {
    id: string; 
    first_name: string;
    last_name: string;
    email: string;
    expertise_level: string;
    xp_points: number;
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
                const res = await fetch(`${backendURL}/assignments/dashboard`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setTeacherAssignments(await res.json());
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

            setAttempt(data.attempt_id, Date.now());
            navigate(`/case/solve/${data.attempt_id}`);

        } catch (error) {
            console.error("Greška", error);
        }
    }


    const handleCaseArchive = async (caseId: string) => {
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
                throw new Error(errorData.detail || "Greška pri brisanju");
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
            <main className="flex-1 px-5">
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

                                {filter === "archived" ? <button onClick={() => handleEditCase(c.id)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-xl hover:bg-orange-600 hover:cursor-pointer transition shadow-md">
                                    Pregledaj
                                </button> : <button onClick={() => handleStartCase(c.id)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-xl hover:bg-orange-600 hover:cursor-pointer transition shadow-md">
                                    Isprobaj
                                </button>}
                                
                            </div>
                        ))}
                    </div>
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
                                                        {/* <button onClick={() => handleViewAssignment(a.id)} className="w-full mt-5 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer border border-gray-500">
                                                            Detalji zadaće
                                                        </button> */}
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
                                        className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Dodaj
                                    </button>

                                    <button 
                                        onClick={() => setRemoveStudentFromGroupModalOpen(true)} 
                                        className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        Ukloni
                                    </button>
                                </div>

                                {groupMembers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    <div className="mt-5">
                        <button onClick={() => setCreateGroupModalOpen(true)} className="bg-green-600 px-4 py-2 rounded font-bold hover:cursor-pointer">
                            Nova zadaća
                        </button>
                        <div>
                            {teacherAssignments.map((a) => (
                                <div key={a.id}>
                                    {a.title}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
            </main>
            <Modal isOpen={caseArchiveModalOpen} onClose={() => setCaseArchiveModalOpen(false)} title="Arhivirati slučaj?">
                <div className="flex justify-center w-full">
                    <button onClick={() => handleCaseArchive(caseToArchiveId)} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>
            <Modal isOpen={createGroupModalOpen} onClose={() => setCreateGroupModalOpen(false)} title="Nova grupa">
                <div className="flex flex-col w-full gap-5 mt-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Naziv grupe</label>
                        <input 
                            type="text" 
                            placeholder="npr. Programsko inženjerstvo P02" 
                            name="name"
                            value={formData.name} 
                            onChange={handleChange} 
                            className="w-full p-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-gray-400"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Akademska godina</label>
                        <select 
                            name="academic_year"
                            value={formData.academic_year} 
                            onChange={handleChange}
                            className="w-full p-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Odaberite akademsku godinu...</option>
                            <option value="2025/2026">2025/2026</option>
                            <option value="2026/2027">2026/2027</option>
                            <option value="2027/2028">2027/2028</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleCreateGroup} 
                        disabled={!formData.name || !formData.academic_year} // Onemogućuje klik ako nisu popunjena oba polja
                        className="mt-2 w-full cursor-pointer bg-orange-500 text-white font-bold px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md"
                    >
                        Kreiraj grupu
                    </button>
                </div>
            </Modal>

            <Modal 
                isOpen={addStudentToGroupModalOpen} 
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
        </div>
    );
};

export default TeacherDashboard;

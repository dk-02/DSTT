import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useCaseSolvingStore } from "../../store/useCaseSolveStore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar, GraduationHat02, User01, Users01 } from "@untitledui/icons";
import { Modal } from "../UI/Modal";
import SolveHistory from "../SolveHistory";
import Statistics from "../../pages/Statistics";

interface Case {
    id: string;
    title: string;
    version: number;
    level: string;
    topic_name: string;
    status: string;
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

interface AssignmentCaseDetail {
    id: string;
    title: string;
    version: number;
    level: string;
    topic_name: string;
    sequence_no: number;
    status: string;
}

interface AssignmentDetails {
    id: string;
    title: string;
    type: string;
    instructions: string;
    teacher_name: string;
    cases: AssignmentCaseDetail[];
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function ExamineeDashboard() {    
    const [cases, setCases] = useState<Case[]>([]);
    const [studentGroups, setStudentGroups] = useState<Group[]>([]);
    const [studentAssignments, setStudentAssignments] = useState<Assignment[]>([]);

    const [selectedPracticeMode, setSelectedPracticeMode] = useState<"practice" | "practice_exam">("practice");
    const [caseToStartId, setCaseToStartId] = useState<string | null>(null);
    const [startCaseModalOpen, setStartCaseModalOpen] = useState<boolean>(false);

    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetails | null>(null);
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [groupAssignments, setGroupAssignments] = useState<Assignment[]>([]);

    const setAttempt = useCaseSolvingStore((state) => state.setAttempt);
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const menuTabs = [
        { name: "available_cases", label: "Dostupni slučajevi" },
        { name: "groups", label: "Moje grupe" },
        { name: "assignments", label: "Moje zadaće" },
        { name: "solve-history", label: "Povijest rješavanja" },
        { name: "statistics", label: "Statistika" }
    ]

    const [searchParams, setSearchParams] = useSearchParams();

    const menuTab = searchParams.get("tab") || "available_cases";

    const changeTab = (newTab: string) => {
        setSearchParams({tab: newTab});
    }

    const fetchedTabs = useRef({
        available_cases: false,
        groups: false,
        assignments: false
    });

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const res = await fetch(`${backendURL}/cases/available`, {
                    method: "GET",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json" 
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setCases(data);
                }                
            } catch (error) {
                console.error("Greška pri dohvaćanju slučajeva.", error);
            }            
        };

        const fetchGroups = async () => {
            try {
                const res = await fetch(`${backendURL}/groups`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setStudentGroups(await res.json());
            } catch (error) {
                console.error("Greška pri dohvaćanju grupa", error);
            }
        };

        const fetchAssignments = async () => {
            try {
                const res = await fetch(`${backendURL}/assignments/dashboard`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) setStudentAssignments(await res.json());
            } catch (error) {
                console.error("Greška pri dohvaćanju zadaća", error);
            }
        };

        if (menuTab === "available_cases" && !fetchedTabs.current.available_cases) {
            fetchCases();
        } else if (menuTab === "groups" && !fetchedTabs.current.groups) {
            fetchGroups();
        } else if (menuTab === "assignments" && !fetchedTabs.current.assignments) {
            fetchAssignments();
        }

    }, [menuTab, token]);


    const handleViewGroup = async (group: Group) => {
        setSelectedGroup(group);
        try {
            const res = await fetch(`${backendURL}/groups/${group.id}/assignments`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setGroupAssignments(data);
            } else {
                console.error("Greška pri dohvaćanju zadaća za grupu.");
            }
        } catch (error) {
            console.error("Greška", error);
        }
    };

    const handleViewAssignment = async (assignmentId: string) => {
        try {
            const res = await fetch(`${backendURL}/assignments/${assignmentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedAssignment(data);
                setAssignmentModalOpen(true);
            } else {
                alert("Greška pri dohvaćanju detalja zadaće.");
            }
        } catch (error) {
            console.error("Greška", error);
            alert("Došlo je do pogreške na mreži.");
        }
    };

    const closeAssignmentModal = () => {
        setAssignmentModalOpen(false);
        setSelectedAssignment(null);
    };

    const handleStartCase = async (caseId: string, assignmentId: string | null = null, assignmentType: string | null = null, selectedPracticeMode?: string) => {
        const isPractice = assignmentId === null || assignmentType === "practice" || assignmentType === "practice_exam";
        const isExamSimulation = (assignmentId && assignmentType === "practice_exam") || (!assignmentId && selectedPracticeMode === "practice_exam");

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
                            onClick={() => changeTab(tab.name)} 
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
            <main className="flex-1 px-5 overflow-y-auto">
                {menuTab === "available_cases" && (
                    <>
                        <div className="my-5 flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                            <div>
                                <h2 className="text-xl font-bold text-white">Pregled dostupnih slučajeva</h2>
                                <p className="text-sm text-gray-400 mt-1">Rješavajte za vježbu</p>
                            </div>
                        </div>
                        {cases.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {cases.map((c) => (
                                    <div key={c.id} className="flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group">
                                        <div className="flex justify-between items-start p-4 bg-gray-700/50 border-b border-gray-600">
                                            <span className="bg-gray-800 text-xs font-semibold px-2 py-1 rounded-md text-gray-300">
                                                {c.topic_name}
                                            </span>
                                            <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-2 py-1 rounded-md">
                                                Razina: {c.level === "novice" ? "početna" : c.level === "intermediate" ? "srednja" : "napredna"} 
                                            </span>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1 transition-colors">
                                                    {c.title}
                                                </h3>
                                                <p className="text-sm text-gray-400 mb-6">
                                                    Verzija: {c.version}
                                                </p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => {
                                                    setCaseToStartId(c.id);
                                                    setSelectedPracticeMode("practice");
                                                    setStartCaseModalOpen(true);
                                                }} 
                                                className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                                            >
                                                {c.status === "in_progress" ? "Nastavi s rješavanjem" : "Pokreni vježbu"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            renderEmptyState("Nema dostupnih slučajeva", "Trenutno nema objavljenih slučajeva za vježbu.")
                        )}
                    </>
                )}

                {menuTab === "groups" && (
                    selectedGroup ? (
                        <div className="flex flex-col animate-fadeIn mt-5">
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
                                    <span className="flex items-center gap-2"><User01 className="w-4"/> {selectedGroup.teacher_name}</span>
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
                                                    <button onClick={() => handleViewAssignment(a.id)} className="w-full mt-5 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer border border-gray-500">
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
                        </div>
                    ) :
                        <>                        
                            <div className="my-5 flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Pregled grupa</h2>
                                    <p className="text-sm text-gray-400 mt-1">Pregledajte grupe kojih ste član</p>
                                </div>
                            </div>
                            {studentGroups.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {studentGroups.map((g) => (
                                            <div key={g.id} onClick={() => handleViewGroup(g)} className="flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 hover:cursor-pointer transition-colors group">
                                                
                                                <div className="flex justify-between items-start p-4 bg-gray-700/50 border-b border-gray-600">
                                                    <span className="bg-gray-800 text-xs font-semibold px-2 py-1 rounded-md text-gray-300 truncate max-w-[65%]">
                                                        {g.institution_name}
                                                    </span>
                                                    <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-2 py-1 rounded-md">
                                                        {g.academic_year}
                                                    </span>
                                                </div>

                                                <div className="p-5 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white mb-3">
                                                            {g.name}
                                                        </h3>
                                                        <div className="text-sm text-gray-400 space-y-1.5">
                                                            <p className="flex items-center gap-2">
                                                                <User01 className="w-4 text-orange-500"/>
                                                                <span className="text-gray-300 truncate">{g.teacher_name}</span>
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <Users01 className="w-4"/> 
                                                                <span className="text-gray-300">{g.student_count} {getStudentWord(g.student_count)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                            ) : (
                                renderEmptyState("Nema grupa", "Trenutno niste učlanjeni ni u jednu grupu.")
                            )}
                        </>
                )}
                
                {menuTab === "assignments" && (
                    <>
                        <div className="my-5 flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                            <div>
                                <h2 className="text-xl font-bold text-white">Pregled zadaća</h2>
                                <p className="text-sm text-gray-400 mt-1">Pregledajte i riješite dostupne zadaće</p>
                            </div>
                        </div>
                        {studentAssignments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-5">
                                {studentAssignments.map((a) => {
                                    const isExam = a.type === "exam";
                                    const badgeColor = isExam ? "bg-red-900/40 text-red-400" : "bg-purple-900/40 text-purple-400";
                                    const typeLabel = a.type === "practice" ? "Vježba" : a.type === "practice_exam" ? "Probni ispit" : "Ispit";
                                    
                                    const deadline = a.available_until;

                                    return (
                                        <div key={a.id} className="flex flex-col bg-gray-700 rounded-2xl shadow-lg border border-gray-600 overflow-hidden hover:border-gray-500 transition-colors group">
                                            
                                            <div className="flex justify-between items-start p-4 bg-gray-700/50 border-b border-gray-600">
                                                <span className="bg-gray-800 text-xs font-semibold px-2 py-1 rounded-md text-gray-300 truncate max-w-[60%]">
                                                    {a.group_name}
                                                </span>
                                                <span className={`${badgeColor} text-xs font-bold px-2 py-1 rounded-md`}>
                                                    {typeLabel}
                                                </span>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white mb-2">
                                                        {a.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                                        {a.instructions || "Nema dodatnih uputa."}
                                                    </p>
                                                    
                                                    {deadline && (
                                                        <div className="text-xs font-medium inline-block px-2 py-1 rounded bg-gray-800/50 text-gray-300">
                                                            Rok: {new Date(deadline).toLocaleString('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <button onClick={() => handleViewAssignment(a.id)} className="w-full mt-5 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer border border-gray-500">
                                                    Detalji zadaće
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            renderEmptyState("Nema zadaća", "Nemate zadaća koje čekaju na rješavanje.")
                        )}
                    </>
                )}

                {menuTab === "solve-history" && <SolveHistory />}
                {menuTab === "statistics" && <Statistics />}
            </main>
            
            <Modal isOpen={startCaseModalOpen} onClose={() => setStartCaseModalOpen(false)} title="Odabir načina rješavanja vježbe">
                <div className="flex flex-col w-full gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                            onClick={() => setSelectedPracticeMode("practice")}
                            className={`flex flex-col p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                selectedPracticeMode === "practice" 
                                ? "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
                                : "border-gray-400 bg-gray-200 hover:border-gray-500"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`font-bold text-lg ${selectedPracticeMode === "practice" ? "text-orange-400" : "text-gray-700"}`}>
                                    Slobodna vježba
                                </h3>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPracticeMode === "practice" ? "border-orange-500" : "border-gray-500"}`}>
                                    {selectedPracticeMode === "practice" && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Dostupni su svi alati za pomoć (hintovi, poništavanje radnji, LLM mentor). Nema penalizacije za netočne dijagnoze. Idealno za učenje bez pritiska.
                            </p>
                        </div>

                        <div 
                            onClick={() => setSelectedPracticeMode("practice_exam")}
                            className={`flex flex-col p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                selectedPracticeMode === "practice_exam" 
                                ? "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]" 
                                : "border-gray-400 bg-gray-200 hover:border-gray-500"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`font-bold text-lg ${selectedPracticeMode === "practice_exam" ? "text-orange-400" : "text-gray-700"}`}>
                                    Simulacija ispita
                                </h3>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPracticeMode === "practice_exam" ? "border-orange-500" : "border-gray-500"}`}>
                                    {selectedPracticeMode === "practice_exam" && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Alati za pomoć su potpuno isključeni. Svaki netočan pokušaj dijagnoze se penalizira. Pokrenite ako ste spremni za prave ispitne uvjete.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button 
                            onClick={() => {
                                setStartCaseModalOpen(false);
                                setCaseToStartId(null);
                            }}
                            className="px-4 py-2 rounded-lg font-bold bg-gray-700 text-gray-200 transition-colors cursor-pointer"
                        >
                            Odustani
                        </button>
                        
                        <button 
                            onClick={() => {
                                if (caseToStartId) {
                                    handleStartCase(caseToStartId, null, null, selectedPracticeMode);
                                    setStartCaseModalOpen(false);
                                }
                            }}
                            className="px-6 py-2 rounded-lg font-bold bg-orange-500 text-white transition-colors shadow-md cursor-pointer"
                        >
                            Započni
                        </button>
                    </div>
                </div>
            </Modal>

            {assignmentModalOpen && selectedAssignment && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-600 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        
                        <div className="flex justify-between items-center p-6 border-b border-gray-700">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedAssignment.title}</h2>
                                <p className="text-gray-400 text-sm mt-1">Nastavnik: {selectedAssignment.teacher_name}</p>
                            </div>
                            <button onClick={closeAssignmentModal} className="text-gray-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
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
                                                <span>Razina: {c.level === "novice" ? "početna" : c.level === "intermediate" ? "srednja" : "napredna"}</span>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleStartCase(c.id, selectedAssignment.id, selectedAssignment.type)} 
                                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors shadow-md cursor-pointer"
                                        >
                                            {c.status === "in_progress" ? "Nastavi s rješavanjem" : "Pokreni"}
                                        </button>
                                    </div>
                                ))}

                                {selectedAssignment.cases.length === 0 && (
                                    <p className="text-gray-400 italic">Ova zadaća još ne sadrži slučajeve.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamineeDashboard;

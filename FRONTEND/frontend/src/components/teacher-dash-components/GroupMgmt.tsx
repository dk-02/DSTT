import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../UI/Modal";
import { Calendar, GraduationHat02, User01, Users01 } from "@untitledui/icons";
import { useSearchParams } from "react-router-dom";
import { type User, useTeacherStore } from "../../store/useTeacherDashStore";

const backendURL = import.meta.env.VITE_APP_BACKEND;

function GroupMgmt() {
    // GROUPS
    const [createGroupModalOpen, setCreateGroupModalOpen] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        name: "",
        academic_year: ""
    });

    // USERS/STUDENTS
    const [students, setStudents] = useState<User[]>([]);
    const [addStudentToGroupModalOpen, setAddStudentToGroupModalOpen] = useState<boolean>(false);
    const [selectedStudents, setSelectedStudents] = useState<User[]>([]); // ADD
    const [studentsToRemove, setStudentsToRemove] = useState<User[]>([]); // REMOVE
    const [removeStudentFromGroupModalOpen, setRemoveStudentFromGroupModalOpen] = useState<boolean>(false);

    // ASSIGNMENT
    const [assignmentDetailsModalOpen, setAssignmentDetailsModalOpen] = useState(false);

    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);

    const { 
        teacherGroups, 
        selectedGroup, setSelectedGroup, 
        groupAssignments, 
        groupMembers, setGroupMembers,
        selectedAssignment, setSelectedAssignment,
        handleViewGroup, setSelectedAssignmentFullDetails,
        hasFetchedGroups, fetchTeacherGroups
    } = useTeacherStore();

    const [, setSearchParams] = useSearchParams();

    const changeTab = (newTab: string) => {
        setSearchParams({tab: newTab});
    }

    useEffect(() => {
        if (!hasFetchedGroups) {
            fetchTeacherGroups();
        }
    }, [hasFetchedGroups, fetchTeacherGroups]);

    // HANDLERS
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
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
            
            
    // DODAVANJE U GRUPU
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

    const handleSelectStudent = (student: User) => {
        setStudents(prev => prev.filter(u => u.id !== student.id));
        setSelectedStudents(prev => [...prev, student]);
    }
    const handleDeselectStudent = (student: User) => {
        setSelectedStudents(prev => prev.filter(u => u.id !== student.id));
        setStudents(prev => [...prev, student]);
    }

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
    const handleStageForRemoval = (student: User) => {
        setGroupMembers(groupMembers.filter(u => u.id !== student.id));
        setStudentsToRemove(prev => [...prev, student]);
    }
    const handleUnstageForRemoval = (student: User) => {
        setStudentsToRemove(prev => prev.filter(u => u.id !== student.id));
        setGroupMembers([...groupMembers, student]);
    }

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

    const handleViewAssignment = async (assignmentId: string) => {
        try {
            const res = await fetch(`${backendURL}/assignments/${assignmentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                setSelectedAssignment(data);
                setAssignmentDetailsModalOpen(true);
                
            } else {
                alert("Greška pri dohvaćanju detalja zadaće.");
            }
        } catch (error) {
            console.error("Greška", error);
            alert("Došlo je do pogreške na mreži.");
        }
    };

    const closeAssignmentModal = () => {
        setAssignmentDetailsModalOpen(false);
        setSelectedAssignment(null);
    };


    // UI HELPERS
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
        <>
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
                                            
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-gray-300 font-bold text-lg transition-colors shrink-0">
                                                    {initials || <User01 />}
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

                                            {/* <div className="flex items-center justify-between pt-4 border-t border-gray-600 mt-5">
                                                <span className="bg-blue-900/40 text-blue-400 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                    {m.expertise_level || "NEMA RAZINE"}
                                                </span>
                                                
                                                <span className="flex items-center gap-1.5 text-sm font-bold text-orange-400 bg-orange-900/20 px-2 py-1 rounded-lg">
                                                    <Star01 className="w-4" /> {m.xp_points || 0} XP
                                                </span>
                                            </div> */}

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
                                <div key={g.id} className="flex flex-col bg-gray-600 rounded-2xl shadow-lg overflow-hidden transition-all group">

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
                                        
                                        <button onClick={() => handleViewGroup(g)} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-lg hover:cursor-pointer transition shadow-md">
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

                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => { setAddStudentToGroupModalOpen(false); setSelectedStudents([]); }} 
                            className="px-4 py-2 rounded-lg font-bold bg-gray-600 transition-colors cursor-pointer"
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

                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => { setRemoveStudentFromGroupModalOpen(false); setStudentsToRemove([]); }} 
                            className="px-4 py-2 rounded-lg font-bold bg-gray-600 transition-colors cursor-pointer"
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
                            changeTab("assignments"); 
                            setAssignmentDetailsModalOpen(false); 
                            setSelectedAssignmentFullDetails(selectedAssignment);
                        }} className="mb-5 px-6 py-2 rounded-lg font-bold bg-orange-500 text-white hover:cursor-pointer transition-colors shadow-md">
                            Upravljaj zadaćom
                        </button>
                    </div>
                </div>
            )}
        </>
    );
    
}

export default GroupMgmt;
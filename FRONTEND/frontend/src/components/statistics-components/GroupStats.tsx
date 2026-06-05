import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../UI/Modal";
import { useNavigate } from "react-router-dom";

interface StudentStat {
    student_id: string;
    first_name: string;
    last_name: string;
    total_attempts: number;
    success_rate_percentage: number;
    avg_methodology: number;
    avg_independence: number;
}

interface Group {
    group_id: string;
    group_name: string;
    student_stats: StudentStat[];
}

interface CommonMistake {
    description: string;
    mistake_type: string;
    count: number;
}

interface Statistics {
    groups: Group[];
    common_mistakes: CommonMistake[];
}

interface StudentAttempt {
    attempt_id: string;
    case_title: string;
    case_version: number;
    status: string;
    started_at: string;
    teacher_comment: string | null;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function GroupStats() {
    const [stats, setStats] = useState<Statistics>();
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    // STANJA ZA MODAL I DETALJE STUDENTA
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [studentAttempts, setStudentAttempts] = useState<StudentAttempt[]>([]);
    const [loadingAttempts, setLoadingAttempts] = useState<boolean>(false);
    const [selectedStudentName, setSelectedStudentName] = useState<string>("");
    
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetch(`${backendURL}/statistics/group-analytics`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => { 
            setStats(data); 
            if (data.groups && data.groups.length > 0) setSelectedGroupId(data.groups[0].group_id);
            setLoading(false); 
        })
        .catch(err => { console.error(err); setLoading(false); });
    }, [token]);


    const handleOpenDetails = async (studentId: string, firstName: string, lastName: string) => {
        setSelectedStudentName(`${firstName} ${lastName}`);
        setIsModalOpen(true);
        setLoadingAttempts(true);
        
        try {
            const res = await fetch(`${backendURL}/attempts/${selectedGroupId}/student/${studentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setStudentAttempts(data);
            } else {
                console.error("Greška pri dohvaćanju pokušaja studenta.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAttempts(false);
        }
    };


    if (loading) return <div className="text-gray-400">Učitavanje...</div>;
    if (!stats || stats.groups.length === 0) return <div className="text-gray-400">Nemate aktivnih grupa s riješenim zadaćama.</div>;

    const selectedGroup = stats.groups.find((g: Group) => g.group_id === selectedGroupId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <label className="font-bold text-gray-300">Odaberi grupu:</label>
                <select 
                    className="p-2 bg-gray-700 border border-gray-500 rounded text-white outline-none"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                    {stats.groups.map((g: Group) => (
                        <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                    ))}
                </select>
            </div>

            {selectedGroup && (
                <>
                    {selectedGroup.student_stats.length !== 0 ? 
                        <div className="bg-gray-700 rounded-md overflow-hidden">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-gray-900 text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Student</th>
                                        <th className="px-4 py-3">Pokušaji</th>
                                        <th className="px-4 py-3">Točnost</th>
                                        <th className="px-4 py-3">Metodičnost</th>
                                        <th className="px-4 py-3">Samostalnost</th>
                                        <th className="px-4 py-3 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedGroup.student_stats.map((student: StudentStat) => (
                                        <tr key={student.student_id} className="border-b border-gray-600">
                                            <td className="px-4 py-3 font-semibold text-white">{student.first_name} {student.last_name}</td>
                                            <td className="px-4 py-3">{student.total_attempts}</td>
                                            <td className="px-4 py-3 text-green-400 font-bold">{student.success_rate_percentage}%</td>
                                            <td className="px-4 py-3 text-blue-400">{student.avg_methodology}%</td>
                                            <td className="px-4 py-3 text-purple-400">{student.avg_independence}%</td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => handleOpenDetails(student.student_id, student.first_name, student.last_name)}
                                                    className="bg-gray-800 cursor-pointer text-white px-4 py-1.5 rounded text-xs font-bold transition-colors"
                                                >
                                                    Detalji
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table> 
                        </div>
                        : 
                        <span className="text-gray-400">Nema dostupnih podataka.</span>
                    }
                </>
            )}

            {stats.common_mistakes.length !== 0 ? 
                <div className="bg-red-900/20 border border-red-800 p-5 rounded-xl">
                    <h3 className="text-lg font-bold text-red-400 mb-4">Najčešće pogreške (Sve grupe)</h3>
                    <ul className="space-y-2 text-sm">
                        {stats.common_mistakes.map((mistake: CommonMistake, i: number) => (
                            <li key={i} className="flex justify-between items-center bg-gray-800 p-3 rounded">
                                <span>{mistake.description} <span className="text-gray-500 ml-2">({mistake.mistake_type})</span></span>
                                <span className="font-bold text-red-400">{mistake.count} puta</span>
                            </li>
                        ))}
                    </ul>
                </div>
                :
                null
            }

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Pokušaji rješavanja: ${selectedStudentName}`}>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 w-full">
                    {loadingAttempts ? (
                        <p className="text-gray-600">Učitavanje zabilježenih pokušaja...</p>
                    ) : studentAttempts.length === 0 ? (
                        <p className="text-gray-600">Nema zabilježenih pokušaja za ovog studenta u odabranoj grupi.</p>
                    ) : (
                        studentAttempts.map((attempt) => (
                            <div key={attempt.attempt_id} className="bg-gray-200 p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    {attempt.teacher_comment && (
                                        <p className="mb-2 w-fit text-sm px-2 py-1 bg-orange-500/30 text-orange-600 rounded-md font-bold">Pregledano</p>
                                    )}
                                    <p className="text-gray-700 font-bold text-sm">{attempt.case_title} <span className="text-gray-500 text-xs">(v{attempt.case_version})</span></p>
                                    <p className="text-gray-500 text-xs mt-1">Započeto: {new Date(attempt.started_at).toLocaleString("hr-HR")}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-md font-bold ${attempt.status === 'completed' ? 'bg-green-500/30 text-green-600' : attempt.status === 'terminated' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                                            {
                                                attempt.status === "completed" ? "ZAVRŠENO" 
                                                : attempt.status === "terminated" ? "PREKINUTO" 
                                                : attempt.status === "cancelled" ? "ODUSTAO/LA"
                                                : attempt.status === "not_started" ? "NIJE ZAPOČEO/LA"
                                                : attempt.status === "in_progress" ? "U TIJEKU"
                                                : "NEPOZNAT STATUS"
                                            }
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/case/${attempt.attempt_id}/results`)}
                                    className="bg-orange-500 cursor-pointer text-white text-sm font-bold py-2 px-4 rounded"
                                >
                                    Pregledaj
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
            
        </div>
    )
}

export default GroupStats;
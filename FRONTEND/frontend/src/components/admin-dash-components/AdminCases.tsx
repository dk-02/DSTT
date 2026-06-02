import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../UI/Modal";
import { useAuthStore } from "../../store/useAuthStore";
import { useCaseSolvingStore } from "../../store/useCaseSolveStore";

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

const backendURL = import.meta.env.VITE_APP_BACKEND;

function AdminCases() {
    const [availableCases, setAvailableCases] = useState<Case[]>([]);

    const [selectedPracticeMode, setSelectedPracticeMode] = useState<"practice" | "practice_exam">("practice");
    const [caseToStartId, setCaseToStartId] = useState<string | null>(null);
    const [startCaseModalOpen, setStartCaseModalOpen] = useState<boolean>(false);

    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const setAttempt = useCaseSolvingStore((state) => state.setAttempt);

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

                const caseData = await res.json();
                setAvailableCases(caseData);

            } catch (error) {
                console.error("Greška pri dohvaćanju podataka", error);
            }
        };

        fetchCases();
    }, [token]);

    
    // HANDLERS
    const handleStartCase = async (caseId: string, assignmentId: string | null = null, assignmentType: string | null = null, selectedPracticeMode: string) => {
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

    return (
        <div className="p-5">
            <div className="flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-white">Pregled dostupnih slučajeva</h2>
                    <p className="text-sm text-gray-400 mt-1">Upravljajte svojim slučajevima, rješavajte dostupne</p>
                </div>
            </div>

            {availableCases.length > 0 ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {availableCases.map((c) => (
                        <div key={c.id} className="relative flex flex-col bg-gray-600 rounded-xl border border-gray-700 p-5 shadow-lg group">
                            <div className="absolute top-2 left-2 flex gap-2">
                                {c.status === "draft" && <span className="bg-yellow-900/30 text-yellow-500 text-[10px] px-2 py-0.5 rounded italic">Skica</span>}
                                {c.type === "exam" && <span className="bg-red-900/30 text-red-300 text-[10px] px-2 py-1 rounded font-bold uppercase">Ispit</span>}
                            </div>
                            
                            <div className="mt-4 flex-1">
                                <h3 className="text-lg font-bold text-white leading-tight">{c.title}</h3>
                                <p className="text-sm text-gray-300 mt-1">{c.topic_name} • v{c.version}</p>
                            </div>

                            <button onClick={() => {
                                setCaseToStartId(c.id);
                                setSelectedPracticeMode("practice");
                                setStartCaseModalOpen(true);
                            }} className="mt-5 w-full bg-orange-500 text-white font-bold py-2 rounded-xl hover:bg-orange-600 hover:cursor-pointer transition shadow-md">
                                Isprobaj
                            </button>
                            
                        </div>
                    ))}
                </div>
            ) : (
                renderEmptyState("Nema slučajeva", "Trenutno nema javno dostupnih slučajeva."))}

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
        </div>
    );
}

export default AdminCases;
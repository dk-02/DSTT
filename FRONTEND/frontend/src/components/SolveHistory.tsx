import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { ChevronRight } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";

interface EvaluationReport {
    attempt_status: string;
    is_late?: boolean;
    late_readable?: string;
    time_spent: number;
    action_history: {
        type: string;
        status: string;
        description: string;
        feedback?: string;
    }[],
    metrics: {
        accuracy: {
            verdict: string;
            feedback: string;
        };
        efficiency: {
            total_cost_money: number;
            total_cost_time_seconds: number;
            readable_time: string;
            budget_money_limit: number | null;
            budget_exceeded: boolean;
        };
        methodology: {
            score_percentage: number;
            redundant_queries_count: number;
            ignored_indicators_count: number;
            wrong_diagnosis_attempts: number;
            fatal_mistakes_count: number;
        };
        independence: {
            score_percentage: number;
            total_hints_used: number;
            penalized_hints_used: number;
            mentor_queries_count: number;
        };
    };
}

interface AttemptHistory {
    id: string;
    case_title: string;
    assignment_title: string | null;
    attempt_type: string;
    status: string;
    is_practice: boolean;
    started_at: string;
    finished_at: string | null;
    evaluation_report: EvaluationReport; 
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function SolveHistory() {
    // POVIJEST RJEŠAVANJA
    const [history, setHistory] = useState<AttemptHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    const [selectedAttempt, setSelectedAttempt] = useState<AttemptHistory | null>(null);

    const token = useAuthStore((state) => state.token);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const res = await fetch(`${backendURL}/attempts/my-history`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                }
            } catch (error) {
                console.error("Greška pri dohvaćanju povijesti:", error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
            
    }, [token]);
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("hr-HR", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
    };

    const formatTime = (timeSeconds: number) => {
        const hours = Math.floor(timeSeconds / 3600);
        const minutes = Math.floor((timeSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (timeSeconds % 60).toString().padStart(2, '0');
        
        if (hours > 0) {
            return `${hours}:${minutes}:${seconds}`;
        } else {
            return`${minutes}:${seconds}`;
        }
    }

    const renderEmptyState = (title: string, message: string) => (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-700/30 rounded-2xl border border-gray-600 border-dashed">
            <h3 className="text-xl font-bold text-gray-300 mb-2">{title}</h3>
            <p className="text-gray-400">{message}</p>
        </div>
    );


    return (
        <div className="mt-5 h-full overflow-y-auto">
            {!selectedAttempt ? (
                <>
                    <div className="flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm mb-5">
                        <div>
                            <h2 className="text-xl font-bold text-white">Povijest rješavanja</h2>
                            <p className="text-sm text-gray-400 mt-1">Pregledajte svoje pokušaje rješavanja slučajeva.</p>
                        </div>
                    </div>
                    
                    {loadingHistory ? (
                        <p className="text-gray-400 mt-5">Učitavanje povijesti...</p>
                    ) : history.length === 0 ? (
                        renderEmptyState("Nema pokušaja rješavanja", "Trenutno nemate zabilježen nijedan pokušaj rješavanja slučajeva.")
                    ) : (
                        <div className="flex flex-col gap-4 max-w-4xl mt-5">
                            {history.map((attempt) => (
                                <div 
                                    key={attempt.id} 
                                    onClick={attempt.status !== "cancelled" ? () => setSelectedAttempt(attempt) : undefined}
                                    className={`bg-gray-800 rounded-xl p-5 flex items-center justify-between shadow-sm ${attempt.status !== "cancelled" && "cursor-pointer"}`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-lg font-bold text-orange-400">{attempt.case_title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            <span>{formatDate(attempt.started_at)}</span>
                                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                            <span className={`${attempt.is_practice ? 'text-blue-400' : 'text-purple-400 font-semibold'}`}>
                                                {attempt.assignment_title ? attempt.assignment_title : "Slobodna vježba"}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                            ${attempt.status === 'completed' ? 'bg-green-900/50 text-green-400 border border-green-800' : 
                                                attempt.status === 'in_progress' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' : 
                                                'bg-red-900/50 text-red-400 border border-red-800'}`}
                                        >
                                            {attempt.status === 'completed' ? 'Završeno' : attempt.status === 'in_progress' ? 'U tijeku' : 'Prekinuto'}
                                        </span>
                                        {attempt.status !== "cancelled" && <ChevronRight className="text-gray-400" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                // DETALJI POKUŠAJA
                <div className="flex flex-col h-full">
                    <button 
                        onClick={() => setSelectedAttempt(null)}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit font-medium cursor-pointer"
                    >
                        <span>&larr;</span> Natrag na popis pokušaja rješavanja
                    </button>

                    <div className="flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                        <h2 className="text-xl font-bold text-white">Detalji rješavanja</h2>
                    </div>

                    <div className="bg-gray-800 rounded-2xl p-8 max-w-4xl mt-5">
                        <div className="mb-6 pb-6 border-b border-gray-700">
                            <h3 className="text-xl font-bold text-orange-400 mb-2">{selectedAttempt.case_title}</h3>
                            <p className="text-gray-400">
                                {selectedAttempt.attempt_type} {selectedAttempt.assignment_title ? `(${selectedAttempt.assignment_title})` : ""}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Početak</p>
                                <p className="text-gray-200 font-medium">{formatDate(selectedAttempt.started_at)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Vrijeme rješavanja</p>
                                <p className="text-gray-200 font-medium">{formatTime(selectedAttempt.evaluation_report.time_spent)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Status</p>
                                <p className={`font-bold ${selectedAttempt.status === 'completed' ? 'text-green-500' : selectedAttempt.status === 'in_progress' ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {selectedAttempt.status === 'completed' ? 'Završeno' : selectedAttempt.status === 'in_progress' ? 'U tijeku' : 'Prekinuto'}
                                </p>
                            </div>
                        </div>

                        {/* Prikaz rezultata (ako postoje) */}
                        {selectedAttempt.evaluation_report ? (
                            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 mb-6">
                                <h4 className="text-lg font-bold text-gray-100 mb-4">Sažetak rezultata</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Točnost dijagnoze</span>
                                        <span className={`text-lg font-bold ${selectedAttempt.evaluation_report.metrics.accuracy.verdict === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                                            {selectedAttempt.evaluation_report.metrics.accuracy.verdict === 'correct' ? 'Točno' : 
                                                selectedAttempt.evaluation_report.metrics.accuracy.verdict === 'partial' ? 'Djelomično' : 'Netočno'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Metodičnost</span>
                                        <span className="text-lg font-bold text-gray-200">{selectedAttempt.evaluation_report.metrics.methodology.score_percentage}%</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Efikasnost</span>
                                        <span className="text-lg font-bold text-gray-200">€{selectedAttempt.evaluation_report.metrics.efficiency.total_cost_money} | {selectedAttempt.evaluation_report.metrics.efficiency.readable_time}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Samostalnost</span>
                                        <span className="text-lg font-bold text-gray-200">{selectedAttempt.evaluation_report.metrics.independence.score_percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 mb-6 text-gray-400 italic text-center">
                                Cijeli analitički izvještaj bit će dostupan nakon završetka rješavanja.
                            </div>
                        )}

                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
                            {selectedAttempt.status === "in_progress" && (
                                <button 
                                    onClick={() => navigate(`/case/solve/${selectedAttempt.id}`)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                                >
                                    Nastavi rješavanje
                                </button>
                            )}
                            {selectedAttempt.evaluation_report && (
                                <button 
                                    onClick={() => navigate(`/case/${selectedAttempt.id}/results`)}
                                    className="bg-orange-500 hover:cursor-pointer text-white px-6 py-3 rounded-lg font-bold transition-colors"
                                >
                                    Pogledaj puni izvještaj
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
            
    )

}

export default SolveHistory;
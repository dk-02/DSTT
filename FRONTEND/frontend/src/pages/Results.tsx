import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowNarrowLeft } from "@untitledui/icons";
import { useAuthStore } from "../store/useAuthStore";
import { useRole } from "../hooks/useRole";
import { jwtDecode } from "jwt-decode";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface EvaluationReport {
    attempt_status: string;
    action_history: {
        type: string;
        status: string;
        description: string;
        feedback?: string;
    }[],
    time_spent: number;
    is_late?: boolean;
    late_readable?: string;
    metrics: {
        accuracy: {
            verdict: string;
            feedback: string;
        };
        efficiency: {
            total_cost_money: number;
            total_cost_time_seconds: number;
            penalty_cost_money: number;
            penalty_cost_time_seconds: number;
            readable_time_total: string;
            readable_time_penalty: string;
            budget_money_limit: number | null;
            budget_time_limit: number | null;
            budget_exceeded: boolean;
            efficiency_category: string;
        };
        methodology: {
            score_percentage: number;
            redundant_queries_count: number;
            ignored_indicators_count: number;
            wrong_diagnosis_attempts: number;
            fatal_mistakes_count: number;
            unjustified_jumps_count: number;
        };
        independence: {
            score_percentage: number;
            total_hints_used: number;
            penalized_hints_used: number;
            mentor_queries_count: number;
        };
    };
}

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

function Results() {
    const [report, setReport] = useState<EvaluationReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [teacherComment, setTeacherComment] = useState<string | null>(null);
    const [attemptUserId, setAttemptUserId] = useState<string | null>(null);

    const { id: attemptId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const { isTeacher } = useRole();

    let currentUserId = null;
    if (token) {
        const decoded: MyTokenPayload = jwtDecode(token);
        currentUserId = decoded?.sub;
    }
    
    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await fetch(`${backendURL}/attempts/${attemptId}/details`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setReport(data.evaluation_report);
                    setTeacherComment(data.teacher_comment);
                    setAttemptUserId(data.user_id);
                } else {
                    console.error("Greška pri dohvaćanju izvještaja.");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (attemptId) fetchReport();
    }, [attemptId, token]);


    const handleSaveComment = async () => {
        try {
            const res = await fetch(`${backendURL}/attempts/${attemptId}/comment`, {
                method: "PATCH",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ comment: teacherComment })
            });
            if (res.ok) alert("Komentar uspješno spremljen!");
        } catch (err) {
            console.error(err);
        }
    };


    if (loading) {
        return <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Učitavanje rezultata...</div>;
    }

    if (!report) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
                <p className="text-xl font-bold mb-4">Izvještaj nije dostupan.</p>
                <button onClick={() => navigate("/user/dashboard")} className="px-4 py-2 bg-orange-500 text-white rounded-lg">Povratak na nadzornu ploču</button>
            </div>
        );
    }

    const { accuracy, efficiency, methodology, independence } = report.metrics;

    // Pomoćne funkcije za boje
    const getVerdictColor = (verdict: string) => {
        if (verdict === "correct") return "bg-green-100 text-green-800 border-green-300";
        if (verdict === "partial") return "bg-yellow-100 text-yellow-800 border-yellow-300";
        return "bg-red-100 text-red-800 border-red-300";
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600";
        if (score >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const getActionColor = (type: string, status: string) => {
        if (status === "fatal_mistake") return "bg-red-500";
        if (status === "redundant" || status === "consequence_mistake" || status === "unjustified_jump") return "bg-yellow-600";
        if (type === "hint_request") return "bg-orange-500";
        if (type === "mentor_request") return "bg-blue-500";
        if (type === "diagnosis_submission") return status === "correct" ? "bg-green-500" : "bg-red-500";
        return "bg-gray-400"; // Običan DU request
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

    return (
        <div className="min-h-screen text-gray-100 p-8 bg-gray-700 font-sans relative">
            <ArrowNarrowLeft 
                onClick={(isTeacher && attemptUserId !== currentUserId) ? () => navigate("/user/dashboard?tab=statistics") : () => navigate("/user/dashboard?tab=solve-history")} 
                className="absolute top-5 left-5 scale-130 hover:cursor-pointer text-gray-50" 
            />
            <div className="max-w-5xl mx-auto flex flex-col">                
                <div className="flex items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Analitički izvještaj</h1>
                        <p className="text-gray-300 mt-1">Detaljan pregled vašeg dijagnostičkog postupka</p>
                        <p className="text-gray-300 mt-5"><span className="text-orange-400">VRIJEME RJEŠAVANJA:</span> {formatTime(report.time_spent)}</p>
                    </div>
                </div>

                {((isTeacher && attemptUserId !== currentUserId) || teacherComment) && (
                    <div className="bg-gray-800 rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-bold text-orange-500 uppercase tracking-wider mb-2">Povratna informacija nastavnika</h2>
                        
                        {isTeacher ? (
                            <div className="flex flex-col gap-3">
                                <textarea 
                                    value={teacherComment || ""}
                                    onChange={(e) => setTeacherComment(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-gray-100 outline-none focus:border-orange-500"
                                    placeholder="Upišite komentar za studenta..."
                                    rows={3}
                                />
                                <button 
                                    onClick={handleSaveComment}
                                    className="self-end bg-orange-500 cursor-pointer text-white font-bold py-2 px-6 rounded-lg transition-colors"
                                >
                                    Spremi komentar
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-100 italic bg-gray-800/50 p-4 rounded-lg border border-orange-500/30">
                                "{teacherComment}"
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 1. TOČNOST */}
                    <div className="bg-gray-800 rounded-2xl shadow-sm p-6 flex flex-col">
                        <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider mb-4 border-b border-b-gray-700 pb-2">1. Točnost (Accuracy)</h2>
                        <div className={`p-4 rounded-xl border ${getVerdictColor(accuracy.verdict)} mb-4`}>
                            <p className="font-bold uppercase mb-1">
                                {accuracy.verdict === "correct" ? "Točna dijagnoza" : 
                                 accuracy.verdict === "partial" ? "Djelomično točno" : 
                                 accuracy.verdict === "failed_due_to_fatal_mistake" ? "Fatalna pogreška" : "Netočna dijagnoza"}
                            </p>
                            <p className="text-sm opacity-90">{accuracy.feedback}</p>
                        </div>
                    </div>

                    {/* 2. METODIČNOST */}
                    <div className="bg-gray-800 rounded-2xl shadow-sm p-6 flex flex-col">
                        <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider mb-4 border-b border-b-gray-700 pb-2">2. Metodičnost (Methodology)</h2>
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-gray-100 font-medium">Ukupni rezultat:</span>
                            <span className={`text-3xl font-black ${getScoreColor(methodology.score_percentage)}`}>{methodology.score_percentage}%</span>
                        </div>
                        <ul className="space-y-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <li className="flex justify-between">
                                <span>Redundantni (ponovljeni) upiti:</span>
                                <span className="font-bold text-gray-800">{methodology.redundant_queries_count}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Ignorirani preduvjeti (Upozorenja):</span>
                                <span className="font-bold text-gray-800">{methodology.ignored_indicators_count}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Netočni pokušaji dijagnoze:</span>
                                <span className="font-bold text-gray-800">{methodology.wrong_diagnosis_attempts}</span>
                            </li>
                            <li className="flex justify-between text-red-600">
                                <span>Kritične (fatalne) pogreške:</span>
                                <span className="font-bold">{methodology.fatal_mistakes_count}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Neopravdani skokovi (preskakanje razina):</span>
                                <span className="font-bold text-gray-800">{methodology.unjustified_jumps_count}</span>
                            </li>
                        </ul>
                    </div>

                    {/* 3. EFIKASNOST */}
                    <div className="bg-gray-800 rounded-2xl shadow-sm p-6 flex flex-col">
                        <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider mb-4 border-b border-b-gray-700 pb-2">3. Efikasnost (Efficiency)</h2>

                        {/* Značka za kategoriju efikasnosti */}
                        {efficiency.efficiency_category && <div className={`mb-5 p-2 rounded-lg border font-bold text-center uppercase tracking-wide text-sm
                            ${efficiency.efficiency_category === 'bolje_od_kriterija' ? 'bg-green-100 text-green-800 border-green-300' :
                              efficiency.efficiency_category === 'losije_od_kriterija' ? 'bg-red-100 text-red-800 border-red-300' :
                              'bg-blue-100 text-blue-800 border-blue-300'}`}>
                            {efficiency.efficiency_category === "losije_od_kriterija" ? "lošije od kriterija" : efficiency.efficiency_category.replace(/_/g, ' ')}
                        </div>}
                        
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                                <p className="text-blue-500 text-xs font-bold uppercase mb-1">Simulirano Vrijeme</p>
                                <p className="text-2xl font-black text-blue-900">{efficiency.readable_time_total}</p>
                                {efficiency.penalty_cost_time_seconds > 0 && (
                                    <p className="text-xs text-red-600 mt-1 font-semibold">
                                        (+ {Math.floor(efficiency.penalty_cost_time_seconds / 60)} min kazne)
                                    </p>
                                )}
                            </div>
                            <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                                <p className="text-green-500 text-xs font-bold uppercase mb-1">Potrošeni Novac</p>
                                <p className="text-2xl font-black text-green-900">€{efficiency.total_cost_money}</p>
                                {efficiency.penalty_cost_money > 0 && (
                                    <p className="text-xs text-red-600 mt-1 font-semibold">
                                        (+ €{efficiency.penalty_cost_money} kazne)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* {efficiency.budget_money_limit && (
                            <p className={`text-sm font-medium mt-2 text-center ${efficiency.budget_exceeded ? 'text-red-500' : 'text-gray-500'}`}>
                                Budžet: ${efficiency.budget_money_limit} 
                            </p>
                        )} */}

                        {(efficiency.budget_money_limit !== null || efficiency.budget_time_limit !== null) && (
                            <div className="bg-gray-700 p-3 rounded-lg text-sm text-gray-300 mb-2">
                                <p className="font-bold mb-1 text-gray-100">Dopušteni budžet slučaja {efficiency.budget_exceeded ? <span className="text-red-400">(Prekoračeno)</span>  : <span className="text-blue-400">(U granicama)</span>}</p>
                                <ul className="list-disc list-inside ml-4">
                                    {efficiency.budget_money_limit !== null && <li>Novac: €{efficiency.budget_money_limit}</li>}
                                    {efficiency.budget_time_limit !== null && 
                                        <li>Vrijeme: {Math.floor(efficiency.budget_time_limit / 3600)}h {Math.floor((efficiency.budget_time_limit % 3600) / 60)}m</li>
                                    }
                                </ul>
                            </div>
                        )}

                        {report.is_late && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium text-center">
                                Rad je predan s kašnjenjem od {report.late_readable}.
                            </div>
                        )}
                    </div>

                    {/* 4. SAMOSTALNOST */}
                    <div className="bg-gray-800 rounded-2xl shadow-sm p-6 flex flex-col">
                        <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider mb-4 border-b border-b-gray-700 pb-2">4. Samostalnost (Independence)</h2>
                        
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-gray-100 font-medium">Ukupni rezultat:</span>
                            <span className={`text-3xl font-black ${getScoreColor(independence.score_percentage)}`}>{independence.score_percentage}%</span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                            <div 
                                className={`h-3 rounded-full ${independence.score_percentage >= 80 ? 'bg-green-500' : independence.score_percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                style={{ width: `${independence.score_percentage}%` }}
                            ></div>
                        </div>

                        <div className="flex flex-col text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Iskorišteni hintovi (s penalizacijom):</span>
                                <span className="font-bold text-gray-900 text-lg">{independence.penalized_hints_used}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm font-normal">Iskorišteno hintova (ukupno):</span>
                                <span className="font-bold text-gray-900 text-lg">{independence.total_hints_used}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm font-normal">Broj upita LLM mentoru:</span>
                                <span className="font-bold text-gray-900 text-lg">{independence.mentor_queries_count}</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. REKONSTRUKCIJA POSTUPKA (Timeline) */}
                    <div className="mt-6 p-6 md:col-span-2">
                        <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider mb-6 border-b border-b-gray-500 pb-2">
                            5. Rekonstrukcija postupka
                        </h2>
                        
                        <div className="relative border-l-2 border-gray-500 ml-3 md:ml-4 space-y-8">
                            {report.action_history && report.action_history.map((action, index) => (
                                <div key={index} className="relative pl-6">
                                    <div className={`absolute -left-2.25 top-0 w-4 h-4 rounded-full border-2 border-gray-800 ${getActionColor(action.type, action.status)}`}></div>
                                    
                                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-200">
                                                {
                                                    action.type === "du_request" ? "Zatražena dijagnostička jedinica" 
                                                    : action.type === "hint_request" ? "Korišten hint" 
                                                    : action.type === "mentor_request" ? "Pitanje mentoru" 
                                                    : action.type === "diagnosis_submission" ? "Pokušaj dijagnoze"
                                                    : action.type === "undo_request" ? "Zatražen UNDO" 
                                                    : "Nepoznata akcija"
                                                }
                                            </h3>

                                            {action.status === "redundant" && <span className="px-2 py-1 bg-yellow-900/50 text-yellow-500 text-xs rounded border border-yellow-800">Redundantno</span>}
                                            {action.status === "consequence_mistake" && <span className="px-2 py-1 bg-yellow-900/50 text-yellow-500 text-xs rounded border border-yellow-800">Upozorenje</span>}
                                            {action.status === "fatal_mistake" && <span className="px-2 py-1 bg-red-900/50 text-red-500 text-xs rounded border border-red-800">Fatalna pogreška</span>}
                                        </div>
                                        {action.type === "du_request" || action.type == "mentor_request" ?
                                            <p className="text-sm text-gray-400 italic mb-2">"{action.description}"</p>
                                            :
                                            <p className="text-sm text-gray-400 italic mb-2">{action.description}</p>
                                        }
                                        
                                        {action.feedback && (
                                            <div className="mt-2 text-sm text-gray-300 bg-gray-800 p-3 rounded border border-gray-700">
                                                <strong>Odgovor sustava:</strong> {action.feedback}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="border border-b border-gray-600"/>

                <button
                    onClick={(isTeacher && attemptUserId !== currentUserId) ? () => navigate("/user/dashboard?tab=statistics") : () => navigate("/user/dashboard?tab=solve-history")}
                    className="bg-orange-500 px-4 py-2 font-bold rounded hover:cursor-pointer w-fit self-center mt-5"
                >
                    Završi pregled
                </button>
            </div>
        </div>
    );
}

export default Results;
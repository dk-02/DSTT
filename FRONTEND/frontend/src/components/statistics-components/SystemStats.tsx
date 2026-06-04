import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Activity, BookOpen01, Users01, Zap } from "@untitledui/icons";

interface Statistics {
    total_users: number;
    total_cases: number;
    public_cases_count: number;
    total_solve_attempts: number;
    total_institutions: number;
    total_llm_mentor_queries: number;
    total_diagnosis_submissions: number;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function SystemStats() {
    const token = useAuthStore((state) => state.token);
    const [stats, setStats] = useState<Statistics>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${backendURL}/statistics/system-monitoring`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => { setStats(data); setLoading(false); })
        .catch(err => { console.error(err); setLoading(false); });
    }, [token]);

    if (loading) return <div className="text-gray-400">Učitavanje...</div>;
    if (!stats) return <div className="text-gray-400">Greška pri dohvaćanju administrativnih podataka.</div>;
    
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-600 pb-2">Platforma i Korisnici</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 flex items-center gap-4">
                    <div className="bg-blue-900/50 p-3 rounded-lg"><Users01 className="text-blue-400 w-6 h-6"/></div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Korisnici</p>
                        <p className="text-2xl font-black text-white">{stats.total_users}</p>
                    </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 flex items-center gap-4">
                    <div className="bg-purple-900/50 p-3 rounded-lg"><BookOpen01 className="text-purple-400 w-6 h-6"/></div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Slučajevi (Javni)</p>
                        <p className="text-2xl font-black text-white">{stats.total_cases} <span className="text-sm font-normal text-gray-400">({stats.public_cases_count})</span></p>
                    </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 flex items-center gap-4">
                    <div className="bg-green-900/50 p-3 rounded-lg"><Activity className="text-green-400 w-6 h-6"/></div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Pokušaji rješavanja</p>
                        <p className="text-2xl font-black text-white">{stats.total_solve_attempts}</p>
                    </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 flex items-center gap-4">
                    <div className="bg-orange-900/50 p-3 rounded-lg"><Zap className="text-orange-400 w-6 h-6"/></div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Institucije</p>
                        <p className="text-2xl font-black text-white">{stats.total_institutions}</p>
                    </div>
                </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-4 mt-8 border-b border-gray-600 pb-2">Potrošnja LLM API-ja (OpenRouter)</h3>
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl flex justify-around">
                <div className="text-center">
                    <p className="text-sm text-gray-400 font-medium mb-1">Upiti LLM Mentoru</p>
                    <p className="text-3xl font-black text-orange-500">{stats.total_llm_mentor_queries}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400 font-medium mb-1">Evaluacije Dijagnoza</p>
                    <p className="text-3xl font-black text-green-500">{stats.total_diagnosis_submissions}</p>
                </div>
            </div>
        </div>
    )
}

export default SystemStats;
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";

interface Case {
    case_id: string;
    title: string;
    total_attempts: number;
    success_rate_percentage: number;
    hint_usage_rate_percentage: number;
    avg_money_spent: number;
    avg_time_spent_seconds: number;
}

interface Statistics {
    cases: Case[];
}

interface CaseStatsProps {
    isPractice: boolean;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function CaseStats({ isPractice }: CaseStatsProps) {
    const token = useAuthStore((state) => state.token);
    const [stats, setStats] = useState<Statistics>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${backendURL}/statistics/case-analytics?is_practice=${isPractice}`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => { setStats(data); setLoading(false); })
        .catch(err => { console.error(err); setLoading(false); });
    }, [token, isPractice]);

    if (loading) return <div className="text-gray-400">Učitavanje...</div>;
    if (!stats || stats.cases.length === 0) return <div className="text-gray-400">Nemate objavljenih slučajeva s riješenim pokušajima.</div>;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-orange-400 mb-4">Kvaliteta i balans vaših slučajeva</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.cases.map((c: Case) => (
                    <div key={c.case_id} className="bg-gray-700 p-5 rounded-xl border border-gray-600 flex flex-col justify-between">
                        <div>
                            <h4 className="font-bold text-white mb-2 line-clamp-2">{c.title}</h4>
                            <p className="text-sm text-gray-400 mb-4">Ukupno rješavanja: <span className="font-bold text-white">{c.total_attempts}</span></p>
                        </div>
                        <div className="space-y-2 text-sm bg-gray-800 p-3 rounded-lg border border-gray-600">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Stopa prolaznosti:</span>
                                <span className={`font-bold ${c.success_rate_percentage > 70 ? 'text-green-400' : 'text-red-400'}`}>{c.success_rate_percentage}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Korištenje hintova:</span>
                                <span className="font-bold text-yellow-400">{c.hint_usage_rate_percentage}% rješavanja</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-600 pt-2 mt-2">
                                <span className="text-gray-400">Prosječno novca:</span>
                                <span className="font-bold text-white">€{c.avg_money_spent}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Prosječno vremena:</span>
                                <span className="font-bold text-white">{Math.floor(c.avg_time_spent_seconds / 60)} min</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default CaseStats;
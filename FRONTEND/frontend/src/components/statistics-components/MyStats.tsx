import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

interface Topic {
    topic_name: string;
    success_rate_percentage: number;
}

interface Statistics {
    total_completed_cases: number;
    success_rate_percentage: number;
    avg_methodology_percentage: number;
    avg_independence_percentage: number;
    strongest_topics: Topic[];
    weakest_topics: Topic[];
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function MyStats() {
    const token = useAuthStore((state) => state.token);
    const [stats, setStats] = useState<Statistics>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${backendURL}/statistics/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => { setStats(data); setLoading(false); })
        .catch(err => { console.error(err); setLoading(false); });
    }, [token]);

    if (loading) return <div className="text-gray-400">Učitavanje...</div>;
    if (!stats || stats.total_completed_cases === 0) return <div className="text-gray-400">Još nemate riješenih slučajeva.</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Riješeno slučajeva</p>
                    <p className="text-3xl font-black text-white">{stats.total_completed_cases}</p>
                </div>
                <div className="bg-green-900/30 p-4 rounded-xl border border-green-800 text-center">
                    <p className="text-xs text-green-500 uppercase font-bold mb-1">Točnost</p>
                    <p className="text-3xl font-black text-green-400">{stats.success_rate_percentage}%</p>
                </div>
                <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-800 text-center">
                    <p className="text-xs text-blue-500 uppercase font-bold mb-1">Metodičnost</p>
                    <p className="text-3xl font-black text-blue-400">{stats.avg_methodology_percentage}%</p>
                </div>
                <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-800 text-center">
                    <p className="text-xs text-purple-500 uppercase font-bold mb-1">Samostalnost</p>
                    <p className="text-3xl font-black text-purple-400">{stats.avg_independence_percentage}%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-gray-700 p-5 rounded-xl border border-gray-600">
                    <h3 className="text-lg font-bold text-green-400 mb-4">🏆 Najbolje savladana područja</h3>
                    {stats.strongest_topics.length > 0 ? stats.strongest_topics.map((t: Topic, i: number) => (
                        <div key={i} className="flex justify-between items-center bg-gray-800 p-3 rounded mb-2">
                            <span className="font-semibold text-gray-200">{t.topic_name}</span>
                            <span className="text-green-400 font-bold">{t.success_rate_percentage}% točnosti</span>
                        </div>
                    )) : <p className="text-sm text-gray-500">Nema dovoljno podataka.</p>}
                </div>

                <div className="bg-gray-700 p-5 rounded-xl border border-gray-600">
                    <h3 className="text-lg font-bold text-red-400 mb-4">📖 Područja za ponavljanje</h3>
                    {stats.weakest_topics.length > 0 ? stats.weakest_topics.map((t: Topic, i: number) => (
                        <div key={i} className="flex justify-between items-center bg-gray-800 p-3 rounded mb-2">
                            <span className="font-semibold text-gray-200">{t.topic_name}</span>
                            <span className="text-red-400 font-bold">{t.success_rate_percentage}% točnosti</span>
                        </div>
                    )) : <p className="text-sm text-gray-500">Nema dovoljno podataka.</p>}
                </div>
            </div>
        </div>
    )
}

export default MyStats;
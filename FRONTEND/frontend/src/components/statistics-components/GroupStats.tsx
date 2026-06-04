import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

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

const backendURL = import.meta.env.VITE_APP_BACKEND;

function GroupStats() {
    const token = useAuthStore((state) => state.token);
    const [stats, setStats] = useState<Statistics>();
    const [loading, setLoading] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

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
                <div className="bg-gray-700 rounded-xl overflow-hidden border border-gray-600">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-900 text-gray-400 uppercase">
                            <tr>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Pokušaji</th>
                                <th className="px-4 py-3">Točnost</th>
                                <th className="px-4 py-3">Metodičnost</th>
                                <th className="px-4 py-3">Samostalnost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedGroup.student_stats.map((student: StudentStat) => (
                                <tr key={student.student_id} className="border-b border-gray-600 hover:bg-gray-600">
                                    <td className="px-4 py-3 font-semibold text-white">{student.first_name} {student.last_name}</td>
                                    <td className="px-4 py-3">{student.total_attempts}</td>
                                    <td className="px-4 py-3 text-green-400 font-bold">{student.success_rate_percentage}%</td>
                                    <td className="px-4 py-3 text-blue-400">{student.avg_methodology}%</td>
                                    <td className="px-4 py-3 text-purple-400">{student.avg_independence}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
        </div>
    )
}

export default GroupStats;
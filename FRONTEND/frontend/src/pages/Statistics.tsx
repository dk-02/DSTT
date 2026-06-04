import { useState } from "react";
import { useRole } from "../hooks/useRole";
import CaseStats from "../components/statistics-components/CaseStats";
import GroupStats from "../components/statistics-components/GroupStats";
import MyStats from "../components/statistics-components/MyStats";
import SystemStats from "../components/statistics-components/SystemStats";

function Statistics() {
    const { isTeacher, isExpert, isAdmin } = useRole();

    const [activeTab, setActiveTab] = useState<string>("");

    const tabs = [
        { name: "my-stats", label: "Moj napredak", show: true },
        { name: "group-stats", label: "Moje grupe", show: isTeacher },
        { name: "case-stats", label: "Analitika slučajeva", show: isTeacher || isExpert || isAdmin },
        { name: "system-stats", label: "Nadzor sustava", show: isAdmin }
    ];

    return (
        <>
            <div className="mt-5 flex justify-between items-center bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-white">Pregled statistike</h2>
                    <p className="text-sm text-gray-400 mt-1">Pregledajte statistiku sustava</p>
                </div>
            </div>

            <div className="flex space-x-2 mt-5">
                {tabs.filter(t => t.show).map((tab) => (
                    <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`cursor-pointer px-5 py-3 font-semibold text-sm rounded-t-lg transition-colors ${
                            activeTab === tab.name 
                            ? "bg-orange-500 text-white" 
                            : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-600"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-gray-800 p-6 rounded-xl rounded-tl-none shadow-md min-h-125">
                {activeTab === "my-stats" && <MyStats />}
                {activeTab === "group-stats" && <GroupStats />}
                {activeTab === "case-stats" && <CaseStats />}
                {activeTab === "system-stats" && <SystemStats />}
                {activeTab === "" && <span className="text-gray-400">Odaberite statistiku koju želite vidjeti.</span>}
            </div>
        </>
    )
}

export default Statistics;
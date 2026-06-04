import { useSearchParams } from "react-router-dom";
import SolveHistory from "../SolveHistory";
import CaseMgmt from "./CaseMgmt";
import GroupMgmt from "./GroupMgmt";
import AssignmentMgmt from "./AssignmentMgmt";
import Statistics from "../../pages/Statistics";


function TeacherDashboard() {
    const menuTabs = [
        { name: "cases", label: "Slučajevi" },
        { name: "groups", label: "Grupe" },
        { name: "assignments", label: "Zadaće" },
        { name: "solve-history", label: "Povijest rješavanja" },
        { name: "statistics", label: "Statistika" }
    ]

    const [searchParams, setSearchParams] = useSearchParams();

    const menuTab = searchParams.get("tab") || "cases";

    const changeTab = (newTab: string) => {
        setSearchParams({tab: newTab});
    }

    return (
        <div className="w-full h-full flex">
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col py-6 shrink-0">
                <nav className="flex flex-col space-y-2 px-3">
                    {menuTabs.map((tab) => (
                        <button 
                            key={tab.name}
                            onClick={() => changeTab(tab.name)} 
                            className={`hover:cursor-pointer hover:bg-gray-700 px-4 py-3 text-left rounded-xl transition-all duration-200 font-medium ${
                                menuTab === tab.name 
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" 
                                : "text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 px-5 overflow-y-auto">
                {menuTab === "cases" && <CaseMgmt />}
                {menuTab === "groups" && <GroupMgmt />}
                {menuTab === "assignments" && <AssignmentMgmt />}
                {menuTab === "solve-history" && <SolveHistory />}
                {menuTab === "statistics" && <Statistics />}
            </main>
        </div>
    );
};

export default TeacherDashboard;

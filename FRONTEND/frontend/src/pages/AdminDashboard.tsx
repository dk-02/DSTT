import { ArrowNarrowLeft } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";
import { UserMgmt } from "../components/admin-dash-components/UserMgmt";
import { useState } from "react";
import { InstitutionMgmt } from "../components/admin-dash-components/InstitutionMgmt";
import Header from "../components/UI/Header";

type TabName = "users" | "cases" | "institutions";

function AdminDashboard() {
    const [menuTab, setMenuTab] = useState<TabName>("users");

    const navigate = useNavigate(); 

    const menuTabs = [
        {
            name: "users",
            label: "Korisnici"
        },
        {
            name: "institutions",
            label: "Institucije"
        }
    ]

    return (
        <>
            <Header />
            <div className="flex w-full h-screen bg-gray-700 text-gray-100 overflow-hidden">
                <div className="w-1/5 p-8 bg-gray-800 border-r border-gray-700 flex flex-col justify-between items-center">
                    <div className="flex flex-col items-center gap-6 w-full">
                        <ArrowNarrowLeft 
                            onClick={() => navigate("/")} 
                            className="self-start mb-4 scale-125 cursor-pointer" 
                        />
                        <nav className="w-full space-y-2">
                            {menuTabs.map((t, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setMenuTab(t.name as TabName)} 
                                    className={`p-3 ${menuTab === t.name && 'bg-gray-700'} hover:bg-gray-700 rounded-lg cursor-pointer text-center transition-all`}>{t.label}</div>
                            ))}
                        </nav>
                    </div>
                </div>

                {menuTab === "users" && <UserMgmt />}
                {menuTab === "institutions" && <InstitutionMgmt />}

            </div>
        </>
    );
};

export default AdminDashboard;
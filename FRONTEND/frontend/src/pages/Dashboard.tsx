import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useCaseSolvingStore } from "../store/useCaseSolveStore";
import { Dropdown } from "../components/UI/Dropdown";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/UI/Modal";
import Header from "../components/UI/Header";
import { useRole } from "../hooks/useRole";

interface Case {
    id: string;
    title: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function Dashboard() {
    const [cases, setCases] = useState<Case[]>([]);

    const [caseToDeleteId, setCaseToDeleteId] = useState<string>("");
    const [caseDeleteModalOpen, setCaseDeleteModalOpen] = useState<boolean>(false);

    const token = useAuthStore((state) => state.token);
    const setAttempt = useCaseSolvingStore((state) => state.setAttempt);

    const { isTeacher, isExpert, isExaminee } = useRole();

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCases = async () => {
            const response = await fetch(`${backendURL}/cases/available`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });
            
            const data = await response.json();
            setCases(data);
        };

        fetchCases();
    }, [token]);


    const handleCaseDelete = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}`, {
                method: "DELETE",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.detail);
                throw new Error(errorData.detail || "Greška pri brisanju");
            }
            
            setCases(prevCases => prevCases.filter(c => c.id !== caseId));
            setCaseDeleteModalOpen(false);
    
        } catch (error) {
            console.error("Greška:", error);
        }
    };


    const handleStartCase = async (caseId: string, assignmentId: string | null = null) => {
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
                    is_free_practice: true // DODATI PODRŠKU ZA OSTALE VRSTE
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Greška pri pokretanju slučaja");
            }

            const data = await response.json();

            setAttempt(data.attempt_id, Date.now());
            navigate(`/case/solve/${data.attempt_id}`);

        } catch (error) {
            console.error("Greška", error);
        }
    }

    return (
        <div className="w-screen h-screen bg-gray-700">
            <Header />
            <div className="px-5">
                {(isTeacher || isExpert) && <button onClick={() => navigate("/case/create")} className="cursor-pointer bg-green-600 text-orange-50 font-bold px-3 py-2 mt-5 rounded">Novi slučaj</button>}
                <div className="mt-5 flex gap-5">
                    {cases?.map((c) => (
                        <div key={c.id} className="relative flex flex-col items-center justify-between w-64 h-40 rounded shadow-md p-5 bg-gray-600 text-gray-100">
                            {!isExaminee && <Dropdown 
                                onDelete={() => {
                                    setCaseToDeleteId(c.id);
                                    setCaseDeleteModalOpen(true);
                                }}
                            />}                            
                            <h3 className="mt-3">{c.title}</h3>
                            <button onClick={() => handleStartCase(c.id)} className="cursor-pointer bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-lg">Solve</button>
                        </div>
                    ))}
                </div>
            </div>
            <Modal isOpen={caseDeleteModalOpen} onClose={() => setCaseDeleteModalOpen(false)} title="Obrisati slučaj?">
                <div className="flex justify-center w-full">
                    <button onClick={() => handleCaseDelete(caseToDeleteId)} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>
        </div>
    );
}

export default Dashboard
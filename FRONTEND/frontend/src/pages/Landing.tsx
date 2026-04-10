import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/UI/Modal";
import { useAuthStore } from "../store/useAuthStore";
import { Dropdown } from "../components/UI/Dropdown";
import { useCaseSolvingStore } from "../store/useCaseSolveStore";

interface Case {
    id: string;
    title: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function Landing() {
    const [cases, setCases] = useState<Case[]>([]);
    const [caseDeleteModalOpen, setCaseDeleteModalOpen] = useState<boolean>(false);
    const [caseToDeleteId, setCaseToDeleteId] = useState<string>("");

    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const setAttempt = useCaseSolvingStore((state) => state.setAttempt);

    useEffect(() => {
        const fetchCases = async () => {
            const response = await fetch(`${backendURL}/cases`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
            
            const data = await response.json();
            setCases(data);
        };

        fetchCases();
    }, []);


    const handleCaseDelete = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Greška pri brisanju");
            }
            
            setCases(prevCases => prevCases.filter(c => c.id !== caseId));
            setCaseDeleteModalOpen(false);
    
        } catch (error) {
            console.error("Greška:", error);
            alert("Nije uspjelo brisanje slučaja.");
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
    

    return(
        <div className="w-screen h-screen p-5 bg-gray-700 text-white">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={() => navigate("/case/create")} className="cursor-pointer bg-green-600 text-orange-50 font-bold px-3 py-2 rounded">New case</button>

                    <button onClick={() => navigate("/user/register")} className="cursor-pointer bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded">Register</button>

                    <button onClick={() => navigate("/user/login")} className="cursor-pointer bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded">Login</button>
                </div>

                {user && 
                    <div onClick={() => navigate("/user/profile")} className="hover:bg-gray-800 hover:cursor-pointer flex items-center justify-center w-12.5 h-12.5 bg-gray-900 font-bold rounded-full">
                        <span className="select-none">{user.first_name.at(0)?.toUpperCase()}{user.last_name.at(0)?.toUpperCase()}</span>
                    </div>
                }             
               
            </div>

            <h2 className="font-bold mt-10">Available cases:</h2>
            <div className="mt-5 flex gap-5">
                {cases.map((c) => (
                    <div key={c.id} className="relative flex flex-col items-center justify-between w-64 h-40 rounded shadow-md p-5 bg-gray-600">
                        <Dropdown 
                            onDelete={() => {
                                setCaseToDeleteId(c.id);
                                setCaseDeleteModalOpen(true);
                            }}
                        />
                        <h3 className="mt-3">{c.title}</h3>
                        <button onClick={() => handleStartCase(c.id)} className="cursor-pointer bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-2xl">Solve</button>
                    </div>
                ))}
            </div>

            <Modal isOpen={caseDeleteModalOpen} onClose={() => setCaseDeleteModalOpen(false)} title="Obrisati slučaj?">
                <div className="flex justify-center w-full">
                    <button onClick={() => handleCaseDelete(caseToDeleteId)} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>

        </div>
    );
}

export default Landing;
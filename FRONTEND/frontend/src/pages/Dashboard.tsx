import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useCaseSolvingStore } from "../store/useCaseSolveStore";
import { Dropdown } from "../components/UI/Dropdown";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/UI/Modal";
import Header from "../components/UI/Header";
import { useRole } from "../hooks/useRole";
import { useCaseStore, type DiagnosticUnit } from "../store/useCaseStore";

interface Case {
    id: string;
    title: string;
    version: number;
    level: number;
    topic_name: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function Dashboard() {
    const [cases, setCases] = useState<Case[]>([]);

    const [caseToArchiveId, setCaseToArchiveId] = useState<string>("");
    const [caseArchiveModalOpen, setCaseArchiveModalOpen] = useState<boolean>(false);

    const token = useAuthStore((state) => state.token);
    const setAttempt = useCaseSolvingStore((state) => state.setAttempt);
    const setCaseData = useCaseStore((state) => state.setCaseData);

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


    const handleCaseArchive = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}/archive`, {
                method: "PATCH",
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
            setCaseArchiveModalOpen(false);
    
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


    const handleEditCase = async (caseId: string) => {
        try {
            const response = await fetch(`${backendURL}/cases/${caseId}/full`, {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json" 
                }
            });

            if (!response.ok) throw new Error("Neuspješno dohvaćanje podataka");
            const fullCaseData = await response.json();

            const dataForStore = {
                ...fullCaseData,
                media: [], 
                diagnostic_units: fullCaseData.diagnostic_units.map((du: DiagnosticUnit) => ({
                    ...du,
                    media: [], 
                    required_units: du.required_units || []
                }))
            };

            setCaseData(dataForStore);
            navigate(`/case/edit/${caseId}`);

        } catch (error) {
            console.error("Greška pri pripremi za uređivanje:", error);
            alert("Nije moguće učitati podatke za uređivanje.");
        }
    };

    return (
        <div className="w-screen h-screen bg-gray-700">
            <Header />
            <div className="px-5">
                {(isTeacher || isExpert) && <button onClick={() => navigate("/case/create")} className="cursor-pointer bg-green-600 text-orange-50 font-bold px-3 py-2 mt-5 rounded">Novi slučaj</button>}
                <div className="mt-5 flex gap-5">
                    {cases?.map((c) => (
                        <div key={c.id} className="relative flex flex-col items-center justify-between w-64 h-40 rounded shadow-md p-5 bg-gray-600 text-gray-100">
                            {!isExaminee && <Dropdown 
                                onEdit={() => handleEditCase(c.id)}
                                onArchive={() => {
                                    setCaseToArchiveId(c.id);
                                    setCaseArchiveModalOpen(true);
                                }}
                            />}                            
                            <h3 className="mt-3">{c.title} {c.version}</h3>
                            <button onClick={() => handleStartCase(c.id)} className="cursor-pointer bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-lg">Solve</button>
                        </div>
                    ))}
                </div>
            </div>
            <Modal isOpen={caseArchiveModalOpen} onClose={() => setCaseArchiveModalOpen(false)} title="Arhivirati slučaj?">
                <div className="flex justify-center w-full">
                    <button onClick={() => handleCaseArchive(caseToArchiveId)} className="cursor-pointer bg-red-500 text-orange-50 font-semibold px-3 py-2 rounded">Potvrdi</button>
                </div>
            </Modal>
        </div>
    );
}

export default Dashboard
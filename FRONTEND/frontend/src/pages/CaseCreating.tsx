import { useEffect, useState } from "react";
import { PreviewPanel } from "../components/case-form-components/PreviewPanel";
import CaseForm from "../components/CaseForm";
import { ArrowNarrowLeft, HelpCircle } from '@untitledui/icons';
import { Modal } from "../components/UI/Modal";
import { HelpContent } from "../components/UI/HelpContent";
import { useCaseStore } from "../store/useCaseStore";
import { useNavigate } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

function CaseCreating() {
    const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);

    const navigate = useNavigate();

    const setCategories = useCaseStore((state) => state.setCategories);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch(`${backendURL}/categories`);
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error("Greška pri učitavanju kategorija:", error);
            }
        };

        loadCategories();
    }, [setCategories]);

    return (
        <div className="w-screen h-screen bg-gray-700 flex">
            <ArrowNarrowLeft onClick={() => navigate("/user/dashboard")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <div className="w-2/3">
                <CaseForm/>
            </div>
            <div className="flex flex-col w-1/3 h-full">
                <button 
                    onClick={() => setHelpModalOpen(true)} 
                    className="shrink-0 hover:cursor-pointer bg-gray-200 px-4 py-2 rounded-md flex w-fit self-end m-3"
                >
                    <span className="text-md font-semibold flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-orange-500" /> Pomoć
                    </span>
                </button>
                
                <div className="flex-1 min-h-0">
                    <PreviewPanel/>
                </div>
            </div>

            <Modal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} title='Pomoć pri kreiranju slučaja'>
                <HelpContent/>
            </Modal>
        </div>
    );
}

export default CaseCreating;
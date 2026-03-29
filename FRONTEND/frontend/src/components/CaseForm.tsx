import { BasicInfo } from "./case-form-components/BasicInfo";
import { DiagnosticUnits } from "./case-form-components/DiagnosticUnits";
import { HintsAndDiagnosis } from "./case-form-components/HintsAndDiagnosis";
import { useCaseStore } from "../store/useCaseStore";
import { useNavigate } from "react-router-dom";
import { Modal } from "./UI/Modal";
import { useState } from "react";
import { JsonUploader } from "./JSONUploader";

const backendURL = import.meta.env.VITE_APP_BACKEND;

const CaseForm = () => {
    const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
    const navigate = useNavigate();

    const { caseData, step, setStep, clearCaseData } = useCaseStore();

    const steps = [
        {
            num: 1,
            title: "Osnovno"
        },
        {
            num: 2,
            title: "Dijagnostičke jedinice"
        },
        {
            num: 3,
            title: "Savjeti i dijagnoza"
        }
    ];

    const uploadSingleFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${backendURL}/media/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.media_id;
    };

    const handleCreateCase = async () => {
        try {
            const caseMediaIds = await Promise.all(caseData.media.map(file => uploadSingleFile(file)));

            const processedDUs = await Promise.all(caseData.diagnostic_units.map(async (du) => {
                const duMediaIds = await Promise.all(du.media.map(file => uploadSingleFile(file)));
                return {
                    ...du,
                    media_ids: duMediaIds,
                    media: undefined,
                    level: typeof du.level === 'string' 
                        ? parseInt(du.level) 
                        : du.level,
                    resources: {
                        ...du.resources,
                        money: Number(du.resources.money),
                        time: Number(du.resources.time)
                    }  
                };
            }));

            const processedHints = caseData.hints.map((h, index) => ({
                ...h,
                sequence_no: index + 1,
                cost: Number(h.cost),
                text: h.text
            }));

            const finalPayload = {
                ...caseData,
                media_ids: caseMediaIds,
                media: undefined,
                diagnostic_units: processedDUs,
                hints: processedHints
            };

            const response = await fetch(`${backendURL}/cases`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create case');
            }

            const result = await response.json();            
            alert('Case created successfully!' + result);
            clearCaseData();
            navigate('/'); 
        
        } catch (error) {
            console.error("Error creating case:", error);
        }
    };

    const handleResetForm = () => {
        clearCaseData();
        setResetModalOpen(false);
    }

    return(
        <div className="flex w-full h-full items-center justify-center">
            <div className="bg-gray-600 w-[90%] h-11/12 rounded-2xl shadow-2xl flex flex-col items-center">
                <header className="my-5">
                    <div className="flex gap-3">
                        {steps.map((s) => (
                            <div key={s.num} onClick={() => setStep(s.num)} className={`w-48 py-1 text-center rounded-2xl cursor-pointer select-none ${step === s.num ? 'bg-orange-500 text-white' : 'border border-gray-500 text-gray-100'}`}>
                                <p>{s.title}</p>
                            </div>
                        ))}
                    </div>
                </header>
                
                <JsonUploader/>

                <div className="overflow-y-scroll w-full p-10 flex-1">
                    {step === 1 && <BasicInfo/>}
                    {step === 2 && <DiagnosticUnits/>}
                    {step === 3 && <HintsAndDiagnosis/>}
                </div>

                <div className="w-full flex justify-center gap-5 p-5 border-t border-t-gray-700">
                    <button onClick={() => handleCreateCase()} className="cursor-pointer bg-orange-500 text-orange-50 font-semibold px-3 py-2 rounded-lg">Kreiraj</button>
                    <button onClick={() => setResetModalOpen(true)} className="cursor-pointer bg-red-600 text-orange-50 font-semibold px-3 py-2 rounded-lg">Resetiraj unos</button>
                </div>
            </div>
            <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Resetirati unos?">
                <div className="flex flex-col items-center gap-5 justify-self-center w-full">
                    <p>Ova radnja briše sve podatke upisane u obrazac za kreiranje slučaja. Želite li nastaviti?</p>
                    <button onClick={handleResetForm} className="cursor-pointer bg-red-600 text-orange-50 font-semibold px-3 py-2 rounded-lg">Potvrdi</button>
                </div>
            </Modal>
        </div>
    );

}

export default CaseForm;
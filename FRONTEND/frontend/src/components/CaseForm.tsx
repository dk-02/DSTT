import { BasicInfo } from "./case-form-components/BasicInfo";
import { DiagnosticUnits } from "./case-form-components/DiagnosticUnits";
import { HintsAndDiagnosis } from "./case-form-components/HintsAndDiagnosis";
import { useCaseStore } from "../store/useCaseStore";


const CaseForm = () => {
    const { step, setStep } = useCaseStore();

    const steps = [
        {
            num: 1,
            title: "Basic info"
        },
        {
            num: 2,
            title: "Diagnostic units"
        },
        {
            num: 3,
            title: "Hints and diagnosis"
        }
    ];

    return(
        <div className="flex w-full h-full items-center justify-center">
            <div className="bg-gray-600 w-3/4 h-11/12 rounded-2xl shadow-2xl flex flex-col items-center">
                <header className="my-10">
                    <div className="flex gap-3">
                        {steps.map((s) => (
                            <div key={s.num} onClick={() => setStep(s.num)} className={`w-40 py-1 text-center rounded-2xl cursor-pointer select-none ${step === s.num ? 'bg-orange-500 text-white' : 'border border-gray-500 text-gray-100'}`}>
                                <p>{s.title}</p>
                            </div>
                        ))}
                    </div>
                </header>

                <div className="overflow-y-scroll w-full p-10">
                    {step === 1 && <BasicInfo/>}
                    {step === 2 && <DiagnosticUnits/>}
                    {step === 3 && <HintsAndDiagnosis/>}
                </div>
            </div>
        </div>
    );

}

export default CaseForm;
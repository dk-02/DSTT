import { PreviewPanel } from "../components/case-form-components/PreviewPanel";
import CaseForm from "../components/CaseForm";

function CaseCreating() {
    return (
        <div className="w-screen h-screen bg-gray-700 flex">
            <div className="w-2/3">
                <CaseForm/>
            </div>
            <div className="w-1/3">
                <PreviewPanel/>
            </div>
        </div>
    );
}

export default CaseCreating;
import { useRef } from 'react';
import { useCaseStore, type DiagnosticUnit } from '../store/useCaseStore';

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const JsonUploader = () => {
    const updateCaseData = useCaseStore((state) => state.updateCaseData);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleTemplateDownload = async () => {
        try {
            const response = await fetch(`${backendURL}/templates/download/caseTemplate.json`);
            
            if (!response.ok) throw new Error("Download failed");

            const fileBlob = await response.blob();
            
            const url = window.URL.createObjectURL(fileBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', "caseTemplate.json");
            document.body.appendChild(link);
            link.click();
            
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("Greška pri preuzimanju templatea:", error);
            alert("Nije moguće preuzeti datoteku.");
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        
        reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target?.result as string);

            const safeData = {
            ...importedData,
            media: [], 
            diagnostic_units: importedData.diagnostic_units?.map((du: DiagnosticUnit) => ({
                ...du,
                id: du.id || crypto.randomUUID(), 
                media: []
            })) || []
            };

            updateCaseData(safeData);
            alert("JSON uspješno učitan!");

        } catch (error) {
            console.error("Greška pri parsiranju JSON-a:", error);
            alert("Neispravan JSON format. Provjerite datoteku.");
        }
        };

        reader.readAsText(file);        
        event.target.value = ''; 
    };

    return (
        <div className="mt-3 flex gap-3 w-full justify-center items-center">
            <button onClick={handleTemplateDownload} className='hover:cursor-pointer bg-gray-100 rounded-md py-2 px-4 font-semibold text-blue-800 text-sm'>Preuzmi JSON template</button>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".json"
                className="hidden"
            />

            <button onClick={handleButtonClick} className='hover:cursor-pointer bg-gray-100 rounded-md py-2 px-4 font-semibold text-blue-800 text-sm'>Učitaj slučaj (JSON)</button>

            <p className="text-xs text-slate-400 italic w-32">
                * Ovo će prebrisati trenutni unos u formi.
            </p>
        </div>
    );
};
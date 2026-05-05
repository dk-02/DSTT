import { useCaseStore } from '../../store/useCaseStore';
import React from 'react';

export const PreviewPanel = () => {
  const caseData = useCaseStore((state) => state.caseData);
  const categories = useCaseStore((state) => state.categories);

  const getCategoryHierarchy = () => {
    if (caseData.category_id === "") return [];
    
    const path: string[] = [];
    let current = categories.find(c => c.id === caseData.category_id);

    while (current) {
      path.unshift(current.name);
      current = categories.find(c => c.id === current?.parent_id);
    }
    return path;
  };

  const hierarchy = getCategoryHierarchy();


  return (
    <div className="h-full w-full flex flex-col pt-5">
      <h2 className="text-xl font-bold mb-2 text-gray-50 pb-2">Preview</h2>
      
      <div className="flex-1 space-y-3 overflow-y-scroll">
        <section className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xs uppercase text-gray-400 mb-3">Kategorija</h3>
          <div className="flex gap-2 flex-wrap text-gray-300 text-sm">
            {hierarchy.length > 0 ? hierarchy.map((name, index) => (
              <React.Fragment key={name}>
                <span className={`${index === hierarchy.length - 1 && 'text-orange-400'}`}>{name}</span>
                {index < hierarchy.length - 1 && <span>&gt;</span>}
              </React.Fragment>
            )) : <span className="text-gray-500 text-xs">Nije odabrana.</span>}
          </div>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xs uppercase text-gray-400 mb-3">Inicijalna situacija</h3>
          <p className="text-sm italic text-gray-300 leading-relaxed">
            {caseData.initial_info || "Nije unesena inicijalna informacija..."}
          </p>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xs uppercase text-gray-400 mb-3">Multimedija</h3>
          <div className="flex gap-2 flex-wrap max-h-28 overflow-y-scroll">
            {caseData.media.length > 0 ? caseData.media.map((f, i) => (
              <span key={i} className="px-2 py-1 bg-gray-700 text-gray-100 rounded text-xs">{f.name}</span>
            )) : <span className="text-gray-500 text-xs">Nema učitanih datoteka.</span>}
          </div>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg ">
          <h3 className="text-xs uppercase text-gray-400 mb-3">Dijagnostičke jedinice (DU)</h3>
          <div className="space-y-2 max-h-32 overflow-y-scroll">
            {caseData.diagnostic_units.map((du) => (
              <div key={du.id} className="text-xs p-2 bg-gray-700 rounded flex justify-between items-center">
                <span className='text-gray-400'>{du.name || "Bez naziva"}</span>
                <span className={`px-2 py-0.5 rounded ${du.type === 'data' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'}`}>
                  {du.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <h3 className="text-[11px] uppercase text-gray-400 mb-2">Internal JSON (State Debug)</h3>
        <pre className="text-[11px] bg-black p-4 rounded overflow-x-auto text-green-400 max-h-60">
          {JSON.stringify(caseData, null, 2)}
        </pre>
      </div>
    </div>
  );
};
import { useCaseStore } from '../../store/useCaseStore';

export const PreviewPanel = () => {
  const { caseData } = useCaseStore();

  return (
    <div className="h-full flex flex-col pt-5">
      <h2 className="text-xl font-bold mb-6 text-gray-50 pb-2">Preview</h2>
      
      <div className="flex-1 space-y-6 overflow-y-auto">
        <section className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xs uppercase text-gray-400 mb-2">Inicijalna situacija</h3>
          <p className="text-sm italic text-gray-300 leading-relaxed">
            {caseData.initial_info || "Nije unesena inicijalna informacija..."}
          </p>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xs uppercase text-gray-400 mb-2">Multimedija</h3>
          <div className="flex gap-2 flex-wrap">
            {caseData.media.length > 0 ? caseData.media.map((f, i) => (
              <span key={i} className="px-2 py-1 bg-gray-700 rounded text-[10px]">{f.name}</span>
            )) : <span className="text-gray-500 text-[11px]">Nema učitanih datoteka.</span>}
          </div>
        </section>

        <section className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xs uppercase text-gray-400 mb-2">Dostupne Radnje (DUs)</h3>
          <div className="space-y-2">
            {caseData.diagnostic_units.map((du) => (
              <div key={du.id} className="text-xs p-2 bg-gray-700 rounded flex justify-between items-center">
                <span>{du.name || "Bez naziva"}</span>
                <span className={`px-2 py-0.5 rounded ${du.type === 'DATA' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'}`}>
                  {du.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <h3 className="text-[11px] uppercase text-gray-400 mb-2">Internal JSON (State Debug)</h3>
        <pre className="text-[11px] bg-black p-4 rounded overflow-x-auto text-green-400 max-h-60">
          {JSON.stringify(caseData, null, 2)}
        </pre>
      </div>
    </div>
  );
};
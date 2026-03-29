import { Lightbulb03, CheckCircle, Trash01 } from '@untitledui/icons';
import { useCaseStore, type IncorrectDiagnosisConsequence } from '../../store/useCaseStore';

export const HintsAndDiagnosis = () => {
  const { caseData, addHint, removeHint, updateCaseData } = useCaseStore();

  return (
    <div className="text-gray-50 space-y-8 animate-in slide-in-from-right duration-500">
      <div className="p-6 rounded-xl border space-y-4">
        <div className="flex items-center gap-3 font-bold text-lg">
          <CheckCircle className="w-6 h-6 text-green-500" /> Definiranje Ispravne Dijagnoze
        </div>
        <input 
          className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
          placeholder="npr. Neispravan indukcijski svitak na 2. cilindru"
          value={caseData.correct_diagnosis}
          onChange={(e) => updateCaseData({ correct_diagnosis: e.target.value })}
        />
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">U slučaju pogrešne dijagnoze:</span>
          <select 
            className="p-2 bg-gray-600 border rounded text-sm"
            value={caseData.if_incorrect}
            onChange={(e) => updateCaseData({ if_incorrect: e.target.value as IncorrectDiagnosisConsequence })}
          >
            <option value="terminate">Prekini (TERMINATE)</option>
            <option value="penalize">Kazni (PENALIZE)</option>
            <option value="continue">Nastavi (CONTINUE)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Lightbulb03 className="w-5 h-5 text-orange-500" /> Savjeti (Hints)
          </h3>
          <button onClick={addHint} className="text-md hover:cursor-pointer text-orange-500 hover:underline">+ Dodaj savjet</button>
        </div>
        {caseData.hints.map((hint, i) => (
          <div key={i} className="flex gap-4 p-4 rounded-lg border items-center border-gray-400">
            <p>{i+1}.</p>
            <input 
              className="flex-1 p-2 border border-gray-400 rounded text-sm focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="Tekst savjeta..."
              value={hint.text}
              onChange={(e) => {
                const newHints = [...caseData.hints];
                newHints[i].text = e.target.value;
                updateCaseData({ hints: newHints });
              }}
            />
            <label>Cijena:</label>
            <input 
              type="number"
              className="w-24 p-2 border rounded text-sm focus:ring-1 focus:ring-orange-500 outline-none"
              value={hint.cost}
              onChange={(e) => {
                const newHints = [...caseData.hints];
                newHints[i].cost = Number(e.target.value);
                updateCaseData({ hints: newHints });
              }}
            />
            <button 
              onClick={() => removeHint(i)}
              className="text-gray-400 hover:text-red-500 hover:cursor-pointer transition"
            >
              <Trash01 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
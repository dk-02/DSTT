import { useCaseStore } from '../../store/useCaseStore';
import { Media } from './Media';

export const BasicInfo = () => {
  const { caseData, updateCaseData } = useCaseStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Naslov slučaja</label>
          <input 
            type="text" 
            className="p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            value={caseData.title}
            onChange={(e) => updateCaseData({ title: e.target.value })}
            placeholder="npr. Nemiran rad motora"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-medium">Kategorija</label>
          <select 
            className="p-3 border rounded-lg bg-gray-600"
            value={caseData.category}
            onChange={(e) => updateCaseData({ category: e.target.value })}
          >
            <option value="">Odaberi kategoriju...</option>
            <option value="engine">Motorna grupa</option>
            <option value="electronics">Elektronika</option>
            <option value="braking">Kočioni sustav</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-8 p-4 border rounded-xl">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.type === 'EXERCISE'} 
            onChange={() => updateCaseData({ type: 'EXERCISE' })}
          />
          Vježba
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.type === 'EXAM'} 
            onChange={() => updateCaseData({ type: 'EXAM' })}
          />
          Ispit
        </label>
        <div className="h-6 w-px bg-gray-300" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            className='accent-orange-500'
            checked={caseData.is_public} 
            onChange={(e) => updateCaseData({ is_public: e.target.checked })}
          />
          Javni slučaj
        </label>
        <div className="h-6 w-px bg-gray-300" />
        <p>Težina:</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.level === 'novice'} 
            onChange={() => updateCaseData({ level: 'novice' })}
          />
          Lagano
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.level === 'intermediate'} 
            onChange={() => updateCaseData({ level: 'intermediate' })}
          />
          Srednje
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.level === 'expert'} 
            onChange={() => updateCaseData({ level: 'expert' })}
          />
          Teško
        </label>


      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Opis problema</label>
        <textarea 
          rows={5}
          className="p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          value={caseData.initial_info}
          onChange={(e) => updateCaseData({ initial_info: e.target.value })}
          placeholder="Ovdje opišite što se već zna o slučaju..."
        />
      </div>

      <div>
        <Media/>
      </div>

    </div>
  );
};
import { Plus, Trash01, Zap, Database01 } from '@untitledui/icons';
import { useCaseStore, type DULevel } from '../../store/useCaseStore';
import { Modal } from '../UI/Modal';
import { useState } from 'react';

export const DiagnosticUnits = () => {
  const { caseData, addDU, updateDU, removeDU } = useCaseStore();
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [DUToDeleteId, setDUToDeleteId] = useState<string>("");

  const handleOpenModal = (DUId : string) => {
    setDUToDeleteId(DUId);
    setConfirmModalOpen(true);
  }

  const handleRemoveDU = (DUId : string) => {
    removeDU(DUId);
    setDUToDeleteId("");
    setConfirmModalOpen(false);
  }

  return (
    <div className="text-gray-50 space-y-6 animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Dijagnostičke jedinice (DU)</h2>
        <button onClick={addDU} className="flex items-center gap-2 px-4 py-2 border hover:bg-gray-500 hover:cursor-pointer text-white rounded-lg transition">
          <Plus className="w-4 h-4" /> Dodaj Jedinicu
        </button>
      </div>

      <div className="space-y-4">
        {caseData.diagnostic_units.map((du) => (
          <div key={du.id} className="p-6 border border-gray-200 rounded-xl shadow-sm space-y-4 relative group">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                className="col-span-1 md:col-span-2 p-2 border-b focus:border-orange-500 outline-none font-semibold text-lg"
                placeholder="Naziv jedinice (npr. Provjera tlaka goriva)"
                value={du.name}
                onChange={(e) => updateDU(du.id, { name: e.target.value })}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => updateDU(du.id, { type: 'DATA' })}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 border transition ${du.type === 'DATA' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                >
                  <Database01 className="w-4 h-4" /> DATA
                </button>
                <button 
                  onClick={() => updateDU(du.id, { type: 'ACTION' })}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 border transition ${du.type === 'ACTION' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                >
                  <Zap className="w-4 h-4" /> ACTION
                </button>
                <button 
                  onClick={()=> handleOpenModal(du.id)}
                  className="text-gray-400 hover:text-red-500 hover:cursor-pointer transition ml-4"
                >
                  <Trash01 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <textarea 
              className="w-full p-3 rounded-lg text-sm focus:ring-1 border focus:ring-orange-500 outline-none"
              placeholder="Rezultat koji se vraća ispitaniku..."
              value={du.result_text}
              onChange={(e) => updateDU(du.id, { result_text: e.target.value })}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-gray-500 mb-1 uppercase font-bold tracking-tighter">Razina</label>
                <select 
                  className="w-full p-2 border rounded bg-gray-600"
                  value={du.level}
                  onChange={(e) => updateDU(du.id, { level: e.target.value as DULevel })}
                >
                  <option value="L1">L1 - Inicijalna</option>
                  <option value="L2">L2 - Osnovna</option>
                  <option value="L3">L3 - Invazivna</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-500 mb-1 uppercase font-bold tracking-tighter">Trošak (€)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-orange-500 outline-none"
                  value={du.resources.money}
                  onChange={(e) => updateDU(du.id, { resources: { ...du.resources, money: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1 uppercase font-bold tracking-tighter">Vrijeme</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-orange-500 outline-none"
                  value={du.resources.time}
                  onChange={(e) => updateDU(du.id, { resources: { ...du.resources, time: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1 uppercase font-bold tracking-tighter">Jedinica</label>
                <select 
                   className="w-full p-2 border rounded bg-gray-600"
                   value={du.resources.time_unit}
                   onChange={(e) => updateDU(du.id, { resources: { ...du.resources, time_unit: e.target.value } })}
                >
                  <option value="seconds">Sekunde</option>
                  <option value="minutes">Minute</option>
                  <option value="hours">Sati</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title='Obrisati DU?'>
        <button 
          onClick={() => handleRemoveDU(DUToDeleteId)}
          className={"bg-red-600 w-1/3 p-3 hover:cursor-pointer rounded-lg flex items-center justify-center gap-2 border transition"}
        >
          Potvrdi
        </button>
      </Modal>
    </div>
  );
};
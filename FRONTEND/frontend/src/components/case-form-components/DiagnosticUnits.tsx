import { Plus, Trash01, Zap, Database01, XClose, Upload01 } from '@untitledui/icons';
import { useCaseStore, type consequenceType, type DiagnosticUnit, type DULevel } from '../../store/useCaseStore';
import { Modal } from '../UI/Modal';
import { useState } from 'react';
import { FileIcon } from './FileIcon';

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

  const handleAddMedia = (duId: string, files: FileList | null) => {
    if (!files) return;
    console.log(Array.from(files))
    const currentDu = caseData.diagnostic_units.find(d => d.id === duId);
    const existingMedia = currentDu?.media || [];
    updateDU(duId, { media: [...existingMedia, ...Array.from(files)] });
  };

  const wouldCreateCycle = (allDus: DiagnosticUnit[], targetDuId: string, requiredId: string): boolean => {
    if (targetDuId === requiredId) return true;
    
    const findRequired = (id: string): boolean => {
      const du = allDus.find(d => d.id === id);
      if (!du) return false;
      if (du.required_units.includes(targetDuId)) return true;
      return du.required_units.some(nextId => findRequired(nextId));
    };

    return findRequired(requiredId);
  };

  return (
    <div className="text-gray-50 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Dijagnostičke jedinice (DU)</h2>
        <button onClick={addDU} className="flex items-center gap-2 px-4 py-2 border hover:bg-gray-500 hover:cursor-pointer text-white rounded-lg transition">
          <Plus className="w-4 h-4" /> Dodaj Jedinicu
        </button>
      </div>

      <div className="space-y-4">
        {caseData.diagnostic_units.map((du) => (
          <div key={du.id} className="p-6 border border-gray-400 rounded-xl shadow-sm space-y-4 relative group">
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
              placeholder="Rezultat (tekst) koji se vraća ispitaniku..."
              value={du.result_text}
              onChange={(e) => updateDU(du.id, { result_text: e.target.value })}
            />

            <div className="mb-4">
              <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Priloženi mediji (Rezultat)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center transition min-h-30">
                <input 
                  type="file" 
                  id={`du-media-${du.id}`} 
                  className="hidden" 
                  multiple 
                  onChange={(e) => handleAddMedia(du.id, e.target.files)} 
                />
                <label htmlFor={`du-media-${du.id}`} className="cursor-pointer flex flex-col items-center group">
                  <Upload01 className="w-8 h-8 text-gray-300" />
                  <span className="text-xs text-gray-400 mt-2 font-medium">Prijenos datoteka</span>
                </label> 
              </div>

              <div className="mt-3 w-full space-y-1">
                {du.media?.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-200 p-2 rounded-lg border border-gray-100 text-sm text-gray-700">
                    <div className="flex items-center gap-2 truncate">
                      <FileIcon file={file} />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button onClick={() => {
                      const newMedia = du.media.filter((_, i) => i !== idx);
                      updateDU(du.id, { media: newMedia });
                    }}>
                      <XClose className="w-4 h-4 text-gray-400 hover:text-red-500 hover:cursor-pointer" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className='border-b border-gray-400'/>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className={`${du.type === "ACTION" && 'text-gray-400'} block text-gray-300 mb-1 uppercase font-bold tracking-tighter`}>Razina</label>
                <select 
                  disabled={du.type === "ACTION"}
                  className={`w-full p-2 border rounded bg-gray-600 ${du.type === "ACTION" && 'border border-gray-400 text-gray-400'}`}
                  value={du.level}
                  onChange={(e) => updateDU(du.id, { level: Number(e.target.value) as DULevel })}
                >
                  <option value={1}>L1 - Inicijalna</option>
                  <option value={2}>L2 - Osnovna</option>
                  <option value={3}>L3 - Invazivna</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 uppercase font-bold tracking-tighter">Trošak (€)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-orange-500 outline-none"
                  value={du.resources.money}
                  onChange={(e) => updateDU(du.id, { resources: { ...du.resources, money: Number(e.target.value) <= 0 ? 0 : Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 uppercase font-bold tracking-tighter">Vrijeme</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-orange-500 outline-none"
                  value={du.resources.time}
                  onChange={(e) => updateDU(du.id, { resources: { ...du.resources, time: Number(e.target.value) <= 0 ? 0 : Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 uppercase font-bold tracking-tighter">Jedinica</label>
                <select 
                   className="w-full p-2 border rounded bg-gray-600"
                   value={du.resources.time_unit}
                   onChange={(e) => updateDU(du.id, { resources: { ...du.resources, time_unit: e.target.value } })}
                >
                  <option value="seconds">Sekunde</option>
                  <option value="minutes">Minute</option>
                  <option value="hours">Sati</option>
                  <option value="days">Dani</option>
                </select>
              </div>
            </div>

            <div className='border-b border-gray-400 w-full'/>

            <div>
              {/* REQUIRED UNITS, CONSEQUENCES */}
              <div className="pt-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-gray-300 uppercase">Preduvjeti (Required Units)</label>
                  <select 
                    className="p-2.5 bg-gray-600 border border-gray-200 rounded-lg text-sm outline-none"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const reqId = e.target.value;
                      if (!du.required_units.includes(reqId)) {
                        updateDU(du.id, { required_units: [...du.required_units, reqId], consequences: [...du.consequences, {required_id: reqId, type: "WARNING", value: ""}] });
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">Dodaj preduvjet...</option>
                    {caseData.diagnostic_units
                      .filter(target => target.id !== du.id && !du.required_units.includes(target.id))
                      .filter(target => !wouldCreateCycle(caseData.diagnostic_units, du.id, target.id))
                      .map(target => (
                        <option key={target.id} value={target.id}>{target.name || "Bez naziva"}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="flex flex-col lg:flex-row gap-3">
                  {du.required_units.map(reqId => {
                    const reqDu = caseData.diagnostic_units.find(d => d.id === reqId);
                    const consequence = du.consequences.find(c => c.required_id === reqId);

                    return (
                      <div key={reqId} className="lg:w-1/3 bg-gray-200 p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            Potreban: {reqDu?.name || "Nepoznata jedinica"}
                          </span>
                          <button 
                            onClick={() => {
                              updateDU(du.id, { 
                                required_units: du.required_units.filter(id => id !== reqId),
                                consequences: du.consequences.filter(c => c.required_id !== reqId)
                              });
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <XClose className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-col text-gray-600">
                          <div>
                            <label className="text-xs font-bold">Posljedica ako se preskoči:</label>
                            <select 
                              className="text-xs p-1 border rounded w-full my-2"
                              value={consequence?.type || 'WARNING'}
                              onChange={(e) => {
                                const newCons = [...du.consequences.filter(c => c.required_id !== reqId)];
                                newCons.push({ required_id: reqId, type: e.target.value as consequenceType, value: consequence?.value || '' });
                                updateDU(du.id, { consequences: newCons });
                              }}
                            >
                              <option value="WARNING">Upozorenje (Warning)</option>
                              <option value="TERMINATE">Prekid (Terminate)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold">Poruka za ispitanika:</label>
                            <input 
                              placeholder="Poruka za ispitanika..."
                              className="text-xs p-1 border rounded outline-none w-full mt-2"
                              value={consequence?.value || ''}
                              onChange={(e) => {
                                const newCons = [...du.consequences.filter(c => c.required_id !== reqId)];
                                newCons.push({ required_id: reqId, type: consequence?.type || 'WARNING', value: e.target.value });
                                updateDU(du.id, { consequences: newCons });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
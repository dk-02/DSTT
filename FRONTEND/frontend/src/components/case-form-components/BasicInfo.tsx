import { Check, Plus, X } from '@untitledui/icons';
import { useCaseStore, type caseType } from '../../store/useCaseStore';
import { Media } from './Media';
import { useState } from 'react';
import React from 'react';

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const BasicInfo = () => {
  const { caseData, updateCaseData, categories, setCategories } = useCaseStore();

  const [isAdding, setIsAdding] = useState<{parentId: string | null} | null>(null);
  const [newName, setNewName] = useState("");

  const getChildren = (parentId: string | null) => 
    categories.filter(c => c.parent_id === parentId);

  const getSelectedPath = () => {
    const path: string[] = [];
    let currentId = caseData.category_id;
    while (currentId) {
      const cat = categories.find(c => c.id === currentId);
      if (cat) {
        path.unshift(cat.id);
        currentId = cat.parent_id;
      } else break;
    }
    return path;
  };

  const selectedPath = getSelectedPath();

  const handleAddNew = async (parentId: string | null) => {
    if (!newName.trim()) return;
    
    try {
      const response = await fetch(`${backendURL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, parent_id: parentId })
      });
      const newCat = await response.json();

      setCategories([...categories, newCat]);
      updateCaseData({ category_id: newCat.id });
      setNewName("");
      setIsAdding(null);
    } catch (error) {
      console.error("Greška pri dodavanju kategorije:", error);
    }
  };
  
  const renderCategoryLevel = (parentId: string | null, index: number) => {
    const levelChildren = getChildren(parentId);
    const currentSelectedId = selectedPath[index] || "";

    if (levelChildren.length === 0 && !isAdding) {
        if (index === 0 || selectedPath[index-1]) {
            return (
                <button 
                    onClick={() => setIsAdding({ parentId })}
                    className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 mt-2"
                >
                    <Plus className="w-4 h-4" /> Dodaj podkategoriju
                </button>
            );
        }
        return null;
    }

    return (
      <div key={parentId || 'root'} className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase">
            {index === 0 ? "Glavna Kategorija" : `Podkategorija razine ${index}`}
        </label>
        <div className="flex gap-2">
          <select 
            className="flex-1 px-1 border rounded-lg bg-gray-600 text-gray-50 outline-none"
            value={currentSelectedId}
            onChange={(e) => {
              const newValue = e.target.value;
              
              if (newValue === "") {
                updateCaseData({ category_id: parentId || "" });
              } else {
                updateCaseData({ category_id: newValue });
              }
              
              setIsAdding(null);
            }}
          >
            <option value="">Odaberi...</option>
            {levelChildren.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <button 
              onClick={() => setIsAdding({ parentId })}
              className="p-2 bg-gray-600 border rounded-lg hover:bg-gray-500 transition-colors"
              title="Dodaj novu kategoriju na ovu razinu"
          >
              <Plus className="w-5 h-5 text-orange-400" />
          </button>
        </div>

        {/* Input za dodavanje nove kategorije na ovoj specifičnoj razini */}
        {isAdding?.parentId === parentId && (
            <div className="flex gap-2 mt-1 animate-in slide-in-from-top-2">
                <input 
                    autoFocus
                    className="flex-1 p-2 bg-gray-800 border-b-2 border-orange-500 outline-none text-sm"
                    placeholder="Naziv nove kategorije..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button onClick={() => handleAddNew(parentId)} className="p-2 text-green-400"><Check className="w-5 h-5"/></button>
                <button onClick={() => setIsAdding(null)} className="p-2 text-red-400"><X className="w-5 h-5"/></button>
            </div>
        )}
      </div>
    );
  };

  const caseTypes = [
    {
      type: 'practice',
      name: 'Vježba'
    },
    {
      type: 'exam',
      name: 'Ispit'
    },
  ]

  const difficulties = [
    {
      level: 'novice',
      name: 'Lagano'
    },
    {
      level: 'intermediate',
      name: 'Srednje'
    },
    {
      level: 'expert',
      name: 'Teško'
    }
  ];

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

        <div className="flex flex-col gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-600">
            <label className="font-medium">Kategorizacija</label>
            
            {/* Renderiranje nivoa 1 (Root) */}
            {renderCategoryLevel(null, 0)}

            {/* Renderiranje pod-nivoa na temelju odabrane putanje */}
            {selectedPath.map((id, index) => (
              <React.Fragment key={id}>
                {renderCategoryLevel(id, index + 1)}
              </React.Fragment>
              
            ))}
        </div>
      </div>

      <div className="flex items-center gap-8 p-4 border rounded-xl">

        {caseTypes.map((ct, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.type === ct.type} 
            onChange={() => updateCaseData({ type: ct.type as caseType })}
          />
          {ct.name}
        </label>
        ))}

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
        {difficulties.map((d, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            className='accent-orange-500'
            checked={caseData.level === d.level} 
            onChange={() => updateCaseData({ level: d.level })}
          />
          {d.name}
        </label>
        ))}
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
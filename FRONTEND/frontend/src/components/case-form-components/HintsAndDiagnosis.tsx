import { Lightbulb03, CheckCircle, Trash01, X } from '@untitledui/icons';
import { useCaseStore } from '../../store/useCaseStore';
import { useState } from 'react';

export const HintsAndDiagnosis = () => {
    const { caseData, addHint, removeHint, updateCaseData } = useCaseStore();

    const [keywordInput, setKeywordInput] = useState<string>("");

    const handleAddKeyword = () => {
        if(!keywordInput) return;

        if(!caseData.keywords.includes(keywordInput)) updateCaseData({ keywords: [...caseData.keywords, keywordInput]});

        setKeywordInput("");
    }

    const handleRemoveKeyword = (keywordToRemove: string) => {
        if (caseData.keywords.includes(keywordToRemove)) updateCaseData({ keywords: caseData.keywords.filter(k => k !== keywordToRemove)});
    };

    const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddKeyword();
        }
    };

    return (
        <div className="text-gray-50 space-y-8 animate-in slide-in-from-right duration-500">
            <div className="p-6 rounded-xl border space-y-4">
                <div className="flex items-center gap-3 font-bold text-lg">
                    <CheckCircle className="w-6 h-6 text-green-500" /> Dijagnoza
                </div>
                <input 
                    className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="npr. Neispravan indukcijski svitak na 2. cilindru"
                    value={caseData.correct_diagnosis}
                    onChange={(e) => updateCaseData({ correct_diagnosis: e.target.value })}
                />
                <div className='flex flex-col gap-1 w-1/2'>
                    <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Ključne riječi ili pojmovi</label>
                    <div className='flex gap-3'>
                        <input 
                            className="p-2 border rounded text-sm focus:border-orange-500 outline-none"
                            placeholder="npr. cilindar"
                            onKeyDown={handleKeywordKeyDown}
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                        />
                        <button onClick={() => handleAddKeyword()} className='hover:cursor-pointer bg-gray-100 rounded-md py-2 px-4 font-semibold text-orange-700 text-sm'>Dodaj ključnu riječ</button>
                    </div>
                </div>
                <div className="w-full overflow-y-scroll max-h-32 flex gap-1">
                    {caseData.keywords?.map((kw, idx) => (
                        <div key={idx} className='bg-gray-700 rounded w-fit pl-3 py-1 flex items-center gap-2'>
                            <span>{kw}</span>
                            <button 
                                onClick={() => handleRemoveKeyword(kw)}
                                className="mr-1 p-1.5 rounded-full hover:bg-gray-600 hover:cursor-pointer text-gray-400 transition-colors"
                                title="Ukloni datoteku"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Lightbulb03 className="w-5 h-5 text-orange-500" /> Savjeti (Hints)
                    </h3>
                    <button onClick={addHint} className="text-md hover:cursor-pointer text-orange-400">+ Dodaj savjet</button>
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
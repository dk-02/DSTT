import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { ArrowNarrowUp, ArrowNarrowDown, SearchMd } from "@untitledui/icons";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface AssignmentCreatorProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface CasePreview {
    id: string;
    title: string;
    level: string;
    topic_name?: string;
    correct_diagnosis?: string;
}

interface Case {
    id: string;
    title: string;
    version: number;
    level: number;
    topic_name: string;
    status: string;
    type: string;
    attempt_status: string;
}

interface Settings {
    enable_undo: boolean;
    enable_hints: boolean;
    ignore_hint_cost: boolean;
    enable_LLM_mentor: boolean;
    case_sequence_lock: boolean;
    randomly_choose_cases: boolean;
    show_result_immediately: boolean;
    ignore_terminating_consequences: boolean;
}

interface Category { 
    id: string; 
    name: string; 
}

export function AssignmentCreator({ onClose, onSuccess }: AssignmentCreatorProps) {
    const token = useAuthStore((state) => state.token);

    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [type, setType] = useState("practice");

    const [settings, setSettings] = useState<Settings>({
        enable_hints: true,
        ignore_hint_cost: true,
        enable_undo: true,
        enable_LLM_mentor: true,
        ignore_terminating_consequences: false,
        randomly_choose_cases: false,
        show_result_immediately: true,
        case_sequence_lock: false
    });

    const [selectedCases, setSelectedCases] = useState<CasePreview[]>([]);
    
    const [availableCases, setAvailableCases] = useState<CasePreview[]>([]);
    const [showManualPicker, setShowManualPicker] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const [randomCount, setRandomCount] = useState(1);
    const [randomLevel, setRandomLevel] = useState("");

    const [categories, setCategories] = useState<Category[]>([]);
    const [randomTopic, setRandomTopic] = useState("");

    
    useEffect(() => {
        const fetchAvailableCases = async () => {
            try {
                const res1 = await fetch(`${backendURL}/cases/authored`, { headers: { "Authorization": `Bearer ${token}` } });
                const res2 = await fetch(`${backendURL}/cases/available`, { headers: { "Authorization": `Bearer ${token}` } });
                
                if (res1.ok && res2.ok) {
                    const myCases = await res1.json();
                    const publicCases = await res2.json();
                    const combined = [...myCases, ...publicCases.filter((pc: Case) => !myCases.some((mc: Case) => mc.id === pc.id))];
                    setAvailableCases(combined.filter(c => c.status === "published"));
                }
            } catch (error) {
                console.error("Greška pri dohvaćanju slučajeva", error);
            }
        };

        const fetchCategories = async () => {
            try {
                const res = await fetch(`${backendURL}/categories`, { 
                    headers: { "Authorization": `Bearer ${token}` } 
                });
                if (res.ok) {
                    setCategories(await res.json());
                }
            } catch (error) {
                console.error("Greška pri dohvaćanju kategorija", error);
            }
        };

        fetchAvailableCases();
        fetchCategories();
    }, [token]);

    const handleToggleSetting = (key: keyof Settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const filteredCases = availableCases?.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.topic_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesSearch;
    });

    const handleAddManualCase = (c: CasePreview) => {
        if (!selectedCases.some(sc => sc.id === c.id)) {
            setSelectedCases([...selectedCases, c]);
            setSettings(prev => ({ ...prev, randomly_choose_cases: false }));
        }
    };

    const handleRemoveSelectedCase = (id: string) => {
        setSelectedCases(prev => prev.filter(c => c.id !== id));
    };

    const handleMoveCase = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= selectedCases.length) return;
        
        const updated = [...selectedCases];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setSelectedCases(updated);
    };

    const handleCreateAssignment = async () => {
        if (!title.trim() || selectedCases.length === 0) {
            alert("Unesite naslov i odaberite barem jedan slučaj.");
            return;
        }

        const payload = {
            title,
            instructions,
            type,
            settings: {
                ...settings,
                random_case_picker_settings: settings.randomly_choose_cases ? {
                    no_of_cases: selectedCases.length,
                    case_level: randomLevel || null
                } : null
            },
            selected_case_ids: selectedCases.map((c, index) => ({
                case_id: c.id,
                sequence_no: index + 1
            }))
        };

        try {
            const res = await fetch(`${backendURL}/assignments/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess(); // Zatvara komponentu i osvježava dashboard
            } else {
                const error = await res.json();
                alert(`Greška pri kreiranju: ${error.detail}`);
            }
        } catch (error) {
            console.error("Greška:", error);
        }
    };

    return (
        <div className="overflow-hidden animate-fadeIn pb-10">
            <div className="flex justify-between items-center p-6 border border-gray-700 rounded-2xl bg-gray-800 shadow-md">
                <h2 className="text-2xl font-bold text-white">Nova zadaća</h2>
            </div>

            <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                    <div className="bg-gray-700/30 p-5 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-4">Osnovne informacije</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Naslov zadaće *</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="npr. Vježba 1 - Kardiologija" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Tip zadaće</label>
                                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="practice">Slobodna vježba</option>
                                    <option value="practice_exam">Simulacija ispita</option>
                                    <option value="exam">Ispit</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Upute za studente</label>
                                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" rows={3}></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-700/30 p-5 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-4">Postavke rješavanja</h3>
                        <div className="space-y-3">
                            {[
                                { key: "case_sequence_lock", label: "Zaključaj redoslijed slučajeva" },
                                { key: "enable_LLM_mentor", label: "Omogući AI Mentora" },
                                { key: "enable_hints", label: "Omogući Hintove" },
                                { key: "enable_undo", label: "Omogući Undo (Poništavanje)" },
                                { key: "ignore_hint_cost", label: "Besplatni hintovi (bez bodova)" },
                                { key: "ignore_terminating_consequences", label: "Ignoriraj fatalne greške" },
                                { key: "show_result_immediately", label: "Prikaži rezultat odmah nakon slučaja" }
                            ].map((s) => (
                                <div key={s.key} className="flex justify-between items-center bg-gray-800/50 p-2.5 rounded-lg">
                                    <span className="text-sm text-gray-300">{s.label}</span>
                                    <div onClick={() => handleToggleSetting(s.key as keyof Settings)} className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${settings[s.key as keyof Settings] ? 'bg-orange-500' : 'bg-gray-600'}`}>
                                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${settings[s.key as keyof Settings] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    
                    <div className="bg-gray-700/30 p-5 rounded-xl border border-gray-700 flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Slučajevi ({selectedCases.length})</h3>
                        </div>

                        <div className="space-y-2 mb-6">
                            {selectedCases.length === 0 && <p className="text-sm text-gray-400 italic">Još niste dodali nijedan slučaj.</p>}
                            {selectedCases.map((c, index) => (
                                <div key={c.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-600">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                                        <div>
                                            <p className="text-sm font-bold text-white">{c.title}</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{c.level === "novice" ? "lagano" : c.level === "intermediate" ? "srednje" : "teško"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleMoveCase(index, "up")} disabled={index === 0} className="p-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 cursor-pointer"> <ArrowNarrowUp className="w-4 h-4"/> </button>
                                        <button onClick={() => handleMoveCase(index, "down")} disabled={index === selectedCases.length - 1} className="p-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 cursor-pointer"> <ArrowNarrowDown className="w-4 h-4"/> </button>
                                        <button onClick={() => handleRemoveSelectedCase(c.id)} className="p-1 ml-2 rounded bg-red-900/40 text-red-400 hover:bg-red-800/60 cursor-pointer text-xs font-bold px-2"> ✕ </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto border-t border-gray-600 pt-4">
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setShowManualPicker(false)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${!showManualPicker ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>Nasumičan odabir</button>
                                <button onClick={() => setShowManualPicker(true)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${showManualPicker ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>Ručni odabir</button>
                            </div>

                            {!showManualPicker ? (
                                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-400 mb-1">Broj slučajeva</label>
                                            <input type="number" min="1" max="20" value={randomCount} onChange={(e) => setRandomCount(Number(e.target.value))} className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm outline-none" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-400 mb-1">Razina (opcionalno)</label>
                                            <select value={randomLevel} onChange={(e) => setRandomLevel(e.target.value)} className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm outline-none">
                                                <option value="">Bilo koja</option>
                                                <option value="novice">Početna</option>
                                                <option value="intermediate">Srednja</option>
                                                <option value="expert">Napredna</option>
                                            </select>
                                        </div>

                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-400 mb-1">Tema (opcionalno)</label>
                                            <select value={randomTopic} onChange={(e) => setRandomTopic(e.target.value)} className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm outline-none cursor-pointer">
                                                <option value="">Sve teme</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="relative w-full mb-2">
                                        <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input 
                                            type="text" 
                                            placeholder="Pretraži slučajeve po naslovu ili temi..." 
                                            className="w-full bg-gray-700 border border-gray-500 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 h-44 overflow-y-auto space-y-2">
                                        {filteredCases.map(c => {
                                            const isSelected = selectedCases.some(sc => sc.id === c.id);
                                            return (
                                                <div key={c.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-700 border border-transparent hover:border-gray-600">
                                                    <div className="truncate pr-2 text-sm text-gray-200">{c.title} <span className="text-[11px] text-gray-500">(RAZINA: {c.level === "novice" ? "početna" : c.level === "intermediate" ? "srednja" : "napredna"} | TEMA: {c.topic_name})</span></div>
                                                    <button onClick={() => handleAddManualCase(c)} disabled={isSelected} className="text-xs px-2 py-1 bg-gray-600 text-white rounded cursor-pointer disabled:opacity-30 disabled:cursor-default shrink-0">
                                                        {isSelected ? "Dodano" : "+ Dodaj"}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <div className="px-6 pt-4 flex justify-end gap-5">
                <button onClick={onClose} className="bg-gray-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer">Odustani</button>
                <button 
                    onClick={handleCreateAssignment} 
                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md cursor-pointer"
                >
                    Kreiraj zadaću
                </button>
            </div>
        </div>
    );
}
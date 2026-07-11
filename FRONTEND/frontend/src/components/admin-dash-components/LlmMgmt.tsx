import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../UI/Modal";

interface Provider {
    id: string;
    name: string;
    prefix: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

export function LlmMgmt() {
    const token = useAuthStore((state) => state.token);
    
    // Stanja za formu
    const [provider, setProvider] = useState("google");
    const [apiKey, setApiKey] = useState("");
    const [modelName, setModelName] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    
    // Stanja za prikaz TRENUTNO AKTIVNE konfiguracije
    const [activeProvider, setActiveProvider] = useState("");
    const [activeModel, setActiveModel] = useState("");
    
    // Lista providera iz baze
    const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);

    // Stanja za dodavanje NOVOG providera
    const [showAddProvider, setShowAddProvider] = useState(false);
    const [newProviderName, setNewProviderName] = useState("");
    const [newProviderPrefix, setNewProviderPrefix] = useState("");
    const [providerMessage, setProviderMessage] = useState("");

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const provRes = await fetch(`${backendURL}/llm/llm-providers`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (provRes.ok) {
                    const provData = await provRes.json();
                    setAvailableProviders(provData);
                }

                const confRes = await fetch(`${backendURL}/llm/llm-config`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (confRes.ok) {
                    const confData = await confRes.json();

                    setProvider(confData.provider_name || "gemini");
                    setApiKey(confData.api_key || "");
                    setModelName(confData.model_name || "");
                    setBaseUrl(confData.base_url || "");
                    
                    setActiveProvider(confData.provider_name || "Nije postavljeno");
                    setActiveModel(confData.model_name || "Nije postavljeno");
                }
            } catch (err) {
                console.error("Greška pri dohvaćanju LLM konfiguracije", err);
            } finally {
                setIsLoading(false);
            }
        };
        if (token) fetchConfig();
    }, [token]);

    const handleSaveConfig = async () => {
        setMessage("");
        try {
            const res = await fetch(`${backendURL}/llm/llm-config`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    provider_name: provider,
                    model_name: modelName,
                    api_key: apiKey,
                    base_url: baseUrl
                })
            });

            if (res.ok) {
                setMessage("Postavke su uspješno spremljene!");
                setActiveProvider(provider);
                setActiveModel(modelName);
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("Greška pri spremanju postavki.");
            }
        } catch (err) {
            console.error(err);
            setMessage("Greška na mreži.");
        }
    };

    const handleAddNewProvider = async () => {
        if (!newProviderName || !newProviderPrefix) return;
        setProviderMessage("");

        try {
            const res = await fetch(`${backendURL}/llm/llm-providers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newProviderName,
                    prefix: newProviderPrefix.toLowerCase()
                })
            });

            const data = await res.json();

            if (res.ok) {
                setAvailableProviders([...availableProviders, data.provider]);
                setProvider(data.provider.prefix);
                
                setNewProviderName("");
                setNewProviderPrefix("");
                setShowAddProvider(false);
            } else {
                setProviderMessage(data.detail || "Greška pri dodavanju.");
            }
        } catch (err) {
            console.error(err);
            setProviderMessage("Greška na mreži.");
        }
    };

    if (isLoading) return <div className="p-6 text-white">Učitavanje postavki...</div>;

    return (
        <div className="w-4/5 h-full py-5 px-10 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-semibold">Upravljanje jezičnim modelima (LLM-ovima)</h1>
                    <p className="text-gray-400 mt-1">Pregled, uređivanje i aktivacija LLM modela.</p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <p>Za dodavanje novog providera u sustav, molimo proučite dokumentaciju litellm alata na ovoj <a href="https://docs.litellm.ai/docs/providers" className="hover:underline text-orange-400">poveznici</a> kako biste saznali koji su provideri podržani i kako se pozivaju njihovi modeli.</p>
                <p>U slučaju bilo kakvih pitanja ili problema, javite se putem kontakt forme dostupne na početnoj stranici.</p>
            </div>

            <div className="p-6 bg-gray-800 text-gray-100 rounded-lg shadow-md w-full max-w-2xl overflow-y-auto flex flex-col">
                <h2 className="text-2xl font-bold text-gray-100 mb-6">Konfiguracija LLM API-ja</h2>
                
                {/* Prikaz trenutnog aktivnog stanja */}
                <div className="mb-5 p-4 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-between shadow-inner">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Trenutni Provider</p>
                        <p className={`text-lg font-bold ${activeProvider ? "text-green-400 capitalize" : "text-red-400"}`}>{activeProvider}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Trenutni Model</p>
                        <p className={`text-lg font-bold ${activeModel ? "text-green-400 capitalize" : "text-red-400"}`}>{activeModel}</p>
                    </div>
                </div>

                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors cursor-pointer"
                >
                    Uredi
                </button>
            </div>    

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Promjena konfiguracije">
                <div className="flex flex-col gap-5 w-full">
                    {/* 1. SELEKTOR PROVIDERA */}
                    <div className="p-4 bg-gray-750 border border-gray-400 rounded-lg bg-gray-200">
                        <label className="block text-sm font-semibold mb-2 text-gray-800">Odaberite Providera</label>
                        <div className="flex gap-2">
                            <select 
                                value={provider} 
                                onChange={(e) => setProvider(e.target.value)}
                                className="flex-1 bg-gray-100 border border-gray-400 rounded p-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                {availableProviders.map((p) => (
                                    <option key={p.id} value={p.prefix}>
                                        {p.name} ({p.prefix})
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setShowAddProvider(!showAddProvider)}
                                className="bg-orange-500 text-white px-3 py-2 rounded font-bold cursor-pointer"
                            >
                                {showAddProvider ? "Odustani" : "+ Dodaj"}
                            </button>
                        </div>

                        {/* SEKCIJA ZA DODAVANJE NOVOG PROVIDERA */}
                        {showAddProvider && (
                            <div className="mt-4 p-4 border border-dashed border-gray-500 rounded-lg bg-gray-300">
                                <h4 className="font-semibold text-sm mb-3 text-gray-700">Dodavanje novog providera</h4>
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className="text-xs text-gray-700">Prikazno ime (npr. DeepSeek API)</label>
                                        <input 
                                            type="text" value={newProviderName} onChange={(e) => setNewProviderName(e.target.value)}
                                            className="w-full mt-1 bg-gray-200 border border-gray-400 rounded p-1.5 text-gray-700 focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-700">LiteLLM Prefiks (npr. deepseek)</label>
                                        <input 
                                            type="text" value={newProviderPrefix} onChange={(e) => setNewProviderPrefix(e.target.value)}
                                            className="w-full mt-1 bg-gray-200 border border-gray-400 rounded p-1.5 text-gray-700 focus:ring-1 focus:ring-orange-500"
                                        />
                                    </div>
                                    <button onClick={handleAddNewProvider} className="mt-2 bg-green-600 text-white py-1.5 rounded font-bold cursor-pointer">
                                        Spremi u bazu
                                    </button>
                                    {providerMessage && <p className="text-red-400 text-xs font-semibold">{providerMessage}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">Naziv Modela (npr. gemini-1.5-pro, gpt-4o)</label>
                        <input 
                            type="text" 
                            value={modelName} 
                            onChange={(e) => setModelName(e.target.value)}
                            className="w-full bg-gray-200 border border-gray-400 rounded p-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-700">API Ključ</label>
                        <input 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Zalijepite vaš API ključ ovdje"
                            className="w-full bg-gray-200 border border-gray-400 rounded p-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {/* <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-300">
                            Osnovni URL (Potrebno samo za lokalne custom modele)
                        </label>
                        <input 
                            type="text" 
                            value={baseUrl} 
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="npr. http://localhost:11434/v1"
                            className="w-full bg-gray-700 border border-gray-500 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div> */}

                    <button 
                        onClick={handleSaveConfig} 
                        className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors cursor-pointer"
                    >
                        Spremi LLM Postavke
                    </button>

                    {message && (
                        <div className={`mt-2 p-3 rounded font-semibold ${message.includes("uspješno") ? "bg-green-600/80 text-green-50" : "bg-red-600/80 text-red-50"}`}>
                            {message}
                        </div>
                    )}
                </div>
            </Modal>

        </div>
    );
}
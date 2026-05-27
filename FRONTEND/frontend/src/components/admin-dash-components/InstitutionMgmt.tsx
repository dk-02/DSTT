import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../UI/Modal";
import { Edit01, Plus, Building01, Globe01, Link01 } from "@untitledui/icons";

interface Institution {
    id: string;
    name: string;
    name_short: string;
    is_active: boolean;
    logo_url: string;
    domain: string;
    idp_metadata_url: string;
    registered_at: string;
}

interface InstitutionFormData {
    name: string;
    name_short: string;
    domain: string;
    logo_url: string;
    idp_metadata_url: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const InstitutionMgmt = () => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const token = useAuthStore((state) => state.token);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [formData, setFormData] = useState<InstitutionFormData>({
        name: "",
        name_short: "",
        domain: "",
        logo_url: "",
        idp_metadata_url: ""
    });

    useEffect(() => {    
        const loadInitialInstitutions = async () => {
            try {
                const res = await fetch(`${backendURL}/institutions/`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInstitutions(data);
                }
            } catch (error) {
                console.error("Greška pri dohvaćanju institucija:", error);
            }
        };
        
        loadInitialInstitutions();
    }, [token]);

    const refreshInstitutions = async () => {
        try {
            const res = await fetch(`${backendURL}/institutions/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstitutions(data);
            }
        } catch (error) {
            console.error("Greška pri dohvaćanju institucija:", error);
        }
    };

    // HANDLERI ZA FORMU
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpenCreateModal = () => {
        setEditingInstitution(null);
        setFormData({ name: "", name_short: "", domain: "", logo_url: "", idp_metadata_url: "" });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (inst: Institution) => {
        setEditingInstitution(inst);
        setFormData({
            name: inst.name || "",
            name_short: inst.name_short || "",
            domain: inst.domain || "",
            logo_url: inst.logo_url || "",
            idp_metadata_url: inst.idp_metadata_url || ""
        });
        setIsModalOpen(true);
    };

    const handleSaveInstitution = async () => {
        if (!formData.name) {
            alert("Naziv institucije je obavezan!");
            return;
        }

        const isEditing = !!editingInstitution;
        const url = isEditing 
            ? `${backendURL}/institutions/${editingInstitution.id}` 
            : `${backendURL}/institutions/register`;
        const method = isEditing ? "PATCH" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await refreshInstitutions();
                setIsModalOpen(false);
            } else {
                const error = await res.json();
                alert(`Greška: ${error.detail}`);
            }
        } catch (error) {
            console.error("Mrežna greška:", error);
        }
    };

    // HANDLER ZA DEAKTIVACIJU / REAKTIVACIJU
    const handleToggleStatus = async (inst: Institution) => {
        const action = inst.is_active ? "deactivate" : "reactivate";
        const confirmMsg = inst.is_active 
            ? `Jeste li sigurni da želite DEAKTIVIRATI instituciju "${inst.name}"? Njeni korisnici se više neće moći prijaviti.`
            : `Jeste li sigurni da želite REAKTIVIRATI instituciju "${inst.name}"?`;

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${backendURL}/institutions/${inst.id}/${action}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                await refreshInstitutions();
            } else {
                const error = await res.json();
                alert(`Greška: ${error.detail}`);
            }
        } catch (error) {
            console.error("Mrežna greška:", error);
        }
    };

    return (
        <div className="w-full h-full p-8 flex flex-col gap-6 animate-fadeIn">
            <header className="flex justify-between items-center bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-md">
                <div>
                    <h1 className="text-2xl font-bold text-white">Upravljanje institucijama</h1>
                    <p className="text-sm text-gray-400 mt-1">Pregled, uređivanje i upravljanje pristupom obrazovnim ustanovama.</p>
                </div>
                <button 
                    onClick={handleOpenCreateModal} 
                    className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                >
                    <Plus className="w-5 h-5" /> Nova institucija
                </button>
            </header>

            {institutions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {institutions.map((i) => (
                        <div key={i.id} className={`flex flex-col bg-gray-800 rounded-2xl shadow-lg border overflow-hidden transition-all ${i.is_active ? 'border-gray-600 hover:border-gray-500' : 'border-red-900/50 opacity-80'}`}>
                            
                            <div className="flex justify-between items-start p-5 border-b border-gray-700/50 bg-gray-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center border border-gray-600">
                                        {i.logo_url ? (
                                            <img src={i.logo_url} alt={i.name_short} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <Building01 className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{i.name_short || "Bez kratice"}</h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${i.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                            {i.is_active ? "Aktivna" : "Deaktivirana"}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleOpenEditModal(i)}
                                    className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors cursor-pointer"
                                    title="Uredi"
                                >
                                    <Edit01 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 flex-1 flex flex-col gap-3">
                                <h4 className="text-base font-semibold text-gray-200">{i.name}</h4>
                                
                                <div className="space-y-2 mt-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Globe01 className="w-4 h-4 text-gray-500" />
                                        {i.domain ? <span className="font-mono">{i.domain}</span> : <span className="italic">Nema domene</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Link01 className="w-4 h-4 text-gray-500" />
                                        {i.idp_metadata_url ? <span className="truncate" title={i.idp_metadata_url}>SSO konfiguriran</span> : <span className="italic">Lokalna prijava</span>}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleToggleStatus(i)}
                                    className={`mt-auto w-full py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${
                                        i.is_active 
                                        ? "bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50" 
                                        : "bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/50"
                                    }`}
                                >
                                    {i.is_active ? "Deaktiviraj instituciju" : "Reaktiviraj instituciju"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-800 rounded-2xl border border-gray-700 border-dashed">
                    <Building01 className="w-12 h-12 text-gray-500 mb-3" />
                    <h3 className="text-xl font-bold text-gray-300 mb-1">Nema institucija</h3>
                    <p className="text-gray-400">Trenutno nemate registriranih institucija u sustavu.</p>
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingInstitution ? "Uredi instituciju" : "Nova institucija"}
            >
                <div className="flex flex-col gap-4 mt-2 w-full">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Puni naziv *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="npr. Fakultet elektrotehnike i računarstva" className="w-full px-3 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Kratica</label>
                            <input type="text" name="name_short" value={formData.name_short} onChange={handleChange} placeholder="npr. FER" className="w-full px-3 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Domena (Email)</label>
                            <input type="text" name="domain" value={formData.domain} onChange={handleChange} placeholder="npr. fer.hr" className="w-full px-3 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Logo URL (Opcionalno)</label>
                        <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">SSO IDP Metadata URL (Opcionalno)</label>
                        <input type="text" name="idp_metadata_url" value={formData.idp_metadata_url} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 bg-gray-200 border border-gray-400 text-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-gray-300 mt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg font-bold text-gray-200 bg-gray-600 hover:bg-gray-500 transition-colors cursor-pointer">
                            Odustani
                        </button>
                        <button onClick={handleSaveInstitution} className="px-5 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-md cursor-pointer">
                            {editingInstitution ? "Spremi promjene" : "Kreiraj instituciju"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
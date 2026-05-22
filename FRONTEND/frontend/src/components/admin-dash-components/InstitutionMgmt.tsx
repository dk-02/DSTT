import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

interface Institution {
    id: string;
    name: string;
    name_short: string;
    is_active: boolean;
    logo_url: string;
    domain: string;
    registered_at: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const InstitutionMgmt = () => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);

    const token = useAuthStore((state) => state.token);
    
        useEffect(() => {    
            const fetchInstitutions = async () => {
                try {
                    const res = await fetch(`${backendURL}/institutions/`, {
                        headers: {
                            "Authorization": `Bearer ${token}` 
                        }
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        setInstitutions(data);
                    }
    
                } catch (error) {
                    console.error("Greška pri dohvaćanju institucija:", error);
                }
            };
    
            fetchInstitutions();
    
        }, [token]);

    return(
        <>
            <div className="w-4/5 p-10 flex flex-col gap-6 h-full">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-semibold">Upravljanje institucijama</h1>
                        {/* <p className="text-gray-400">Pregled, uređivanje i aktivacija korisničkih računa.</p> */}
                    </div>
                </header>

                <div>
                    {institutions.map((i) => (
                        <div>{i.name} ({i.name_short})</div>
                    ))}
                </div>
            </div>
        </>
    )
}
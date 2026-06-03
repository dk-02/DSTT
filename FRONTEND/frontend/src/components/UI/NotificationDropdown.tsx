import { useEffect, useState } from "react";
import { Bell01 } from "@untitledui/icons";
import { useAuthStore } from "../../store/useAuthStore";

interface Notification {
    notification_id: string;
    type: string;
    case_id: string;
    case_title: string;
    change_log: string;
    new_version: number;
    status: string;
    message: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${backendURL}/updates/notifications`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Greška pri dohvaćanju obavijesti: ", error);
            }
        };

        fetchNotifications();
        // const interval = setInterval(fetchNotifications, 5000);
        
        // return () => clearInterval(interval); // Očisti pri gašenju
    }, [token]);

    const handleAction = async (notifId: string, action: string) => {
        try {
            await fetch(`${backendURL}/updates/notifications/${notifId}/decision`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ decision: action })
            });
            setNotifications(prev => prev.filter(n => n.notification_id !== notifId));

        } catch (error) {
            console.error("Greška pri akciji: ", error);
        }
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-400 hover:text-white transition">
                <Bell01 className="w-6 h-6" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-gray-800"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 bg-gray-900 border-b border-gray-700 font-bold text-white text-sm">
                        Obavijesti ({notifications.length})
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-sm text-gray-400 text-center">Nemate novih obavijesti.</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.notification_id} className="p-4 border-b border-gray-700 hover:bg-gray-750 transition">
                                    
                                    {n.type === "revoked" ? (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-bold text-red-400 uppercase">Slučaj povučen</span>
                                            <p className="text-sm text-gray-300 leading-tight">{n.message}</p>
                                            <button onClick={() => handleAction(n.notification_id, "read")} className="mt-2 text-xs text-gray-400 hover:text-white underline text-left w-fit cursor-pointer">Označi kao pročitano</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-bold text-blue-400 uppercase">Dostupna nova verzija (v{n.new_version})</span>
                                            <p className="text-sm text-white font-semibold leading-tight">{n.case_title}</p>
                                            <p className="text-xs text-gray-400 italic">"{n.change_log}"</p>
                                            
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={() => handleAction(n.notification_id, "accepted")} className="flex-1 bg-green-600/20 text-green-400 border border-green-600/50 py-1 rounded text-xs font-bold hover:bg-green-600 hover:text-white transition cursor-pointer">Prihvati</button>
                                                <button onClick={() => handleAction(n.notification_id, "declined")} className="flex-1 bg-red-600/20 text-red-400 border border-red-600/50 py-1 rounded text-xs font-bold hover:bg-red-600 hover:text-white transition cursor-pointer">Zadrži staru</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
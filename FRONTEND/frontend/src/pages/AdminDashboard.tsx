import { ArrowNarrowLeft, CheckCircle, Edit01, SearchMd, Trash01, UserPlus01, XCircle } from "@untitledui/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { jwtDecode } from "jwt-decode";
import { Modal } from "../components/UI/Modal";
import { Register } from "./Register";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface User {
    id: number; 
    first_name: string;
    last_name: string; 
    email: string;
    is_active: boolean;
    roles: string[];
}

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

function AdminDashboard() {
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [users, setUsers] = useState<User[]>();
    const [addUserModalOpen, setAddUserModalOpen] = useState<boolean>(false);

    const token = useAuthStore((state) => state.token);

    const navigate = useNavigate(); 

    useEffect(() => {
        const fetchUsers = async () => {
            const res = await fetch(`${backendURL}/users/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data: User[] = await res.json();

                if (token) {
                    const decoded = jwtDecode<MyTokenPayload>(token);
                    const currentUserId = decoded.sub;
    
                    const filteredOtherUsers = data.filter(u => String(u.id) !== String(currentUserId));
                    
                    setUsers(filteredOtherUsers);
                }
            }
        };
        fetchUsers();
    }, [token]);

    const refreshUsers = async () => {
        const res = await fetch(`${backendURL}/users/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const decoded = jwtDecode<MyTokenPayload>(token!);
            setUsers(data.filter((u: User) => String(u.id) !== String(decoded.sub)));
        }
    };

    const handleDeactivate = async (targetUser : User) => {
        try {
            const res = await fetch(`${backendURL}/auth/deactivate?user_id=${targetUser?.id}`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
            });
        
            if (res.ok) {
                setUsers(prevUsers => 
                    prevUsers?.map(user => 
                        user.id === targetUser.id ? { ...user, is_active: false } : user
                    )
                );
            } else {
                const errorData = await res.json();
                alert(`Greška: ${errorData.detail}`);
            }

        } catch (error) {
            console.error(error);
            alert("Došlo je do pogreške pri povezivanju s poslužiteljem.");
        }
    }

    const handleReactivate = async (targetUser : User) => {
        try {
            const res = await fetch(`${backendURL}/auth/reactivate/${targetUser?.id}`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
            });
        
            if (res.ok) {
                setUsers(prevUsers => 
                    prevUsers?.map(user => 
                        user.id === targetUser.id ? { ...user, is_active: true } : user
                    )
                );
            } else {
                const errorData = await res.json();
                alert(`Greška: ${errorData.detail}`);
            }

        } catch (error) {
            console.error(error);
            alert("Došlo je do pogreške pri povezivanju s poslužiteljem.");
        }
    }

    const filteredUsers = users?.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex w-full h-screen bg-gray-900 text-gray-100 overflow-hidden">
            {/* Sidebar */}
            <div className="w-1/5 p-8 bg-gray-800 border-r border-gray-700 flex flex-col justify-between items-center">
                <div className="flex flex-col items-center gap-6 w-full">
                    <ArrowNarrowLeft 
                        onClick={() => navigate("/")} 
                        className="self-start mb-4 scale-125 cursor-pointer" 
                    />
                    <nav className="w-full space-y-2">
                        <div className="p-3 bg-gray-700 rounded-lg cursor-pointer text-center">Korisnici</div>
                        <div className="p-3 hover:bg-gray-700 rounded-lg cursor-pointer text-center transition-all">Slučajevi</div>
                        <div className="p-3 hover:bg-gray-700 rounded-lg cursor-pointer text-center transition-all">Postavke</div>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-4/5 p-10 flex flex-col gap-6 h-full">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-semibold">Upravljanje korisnicima</h1>
                        <p className="text-gray-400">Pregled, uređivanje i aktivacija korisničkih računa.</p>
                    </div>
                    <button onClick={() => setAddUserModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 hover:cursor-pointer text-white px-4 py-2 rounded-lg transition-all font-medium">
                        <UserPlus01 className="w-5 h-5" />
                        Dodaj korisnika
                    </button>
                </header>

                {/* Search Bar */}
                <div className="relative w-full max-w-md shrink-0">
                    <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Pretraži po imenu ili mailu..." 
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl flex flex-col flex-1 min-h-0">
                    {/* Table Header */}
                    <div className="grid grid-cols-6 p-4 bg-gray-750 border-b border-gray-700 text-sm font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-1">Ime i prezime</div>
                        <div className="col-span-1">Email</div>
                        <div className="col-span-1 text-center">Status</div>
                        <div className="col-span-1">Uloge</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-700 overflow-y-scroll">
                        {filteredUsers?.map((user) => (
                            <div key={user.id} className="grid grid-cols-6 p-4 items-center hover:bg-gray-750 transition-colors">
                                <div className="font-medium">{user.first_name} {user.last_name}</div>
                                <div className="text-gray-400 truncate pr-4">{user.email}</div>
                                <div className="flex justify-center">
                                    {user.is_active ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Aktivan
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Neaktivan
                                        </span>
                                    )}
                                </div>
                                <div className="text-gray-400 truncate pr-4 flex flex-wrap gap-1 overflow-x-scroll">
                                    {user.roles.map((role, idx) => (
                                        <span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {role}
                                        </span>
                                    ))}
                                </div>
                                <div className="col-span-2 flex justify-end gap-2 px-2">
                                    {user.is_active ? (
                                        <button onClick={() => handleDeactivate(user)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-all" title="Deaktiviraj">
                                            <XCircle className="w-5 h-5" />
                                            <span className="text-sm">Deaktiviraj</span>
                                        </button>
                                    ) : (
                                        <button onClick={() => handleReactivate(user)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-green-500/10 text-green-400 rounded-lg transition-all" title="Aktiviraj">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="text-sm">Aktiviraj</span>
                                        </button>
                                    )}

                                    <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Uredi">
                                        <Edit01 className="w-5 h-5" />
                                    </button>

                                    <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-red-500 transition-colors" title="Obriši trajno">
                                        <Trash01 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Modal isOpen={addUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="Novi korisnik">
                <Register isAdminMode={true} onSuccess={() => {setAddUserModalOpen(false); refreshUsers();}} />
            </Modal>
        </div>
    );
};

export default AdminDashboard;
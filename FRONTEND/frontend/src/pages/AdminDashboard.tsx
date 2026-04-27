import { ArrowNarrowLeft, Edit01, SearchMd, Trash01, UserPlus01, ChevronSelectorVertical, ChevronDown, ChevronUp } from "@untitledui/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { jwtDecode } from "jwt-decode";
import { Modal } from "../components/UI/Modal";
import { Register } from "./Register";
import { FilterDropdown } from "../components/UI/FilterDropdown";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface User {
    id: string; 
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

type SortConfig = { key: keyof User | ""; direction: "asc" | "desc" };

function AdminDashboard() {
    const [users, setUsers] = useState<User[]>();
    // SORT, SEARCH AND FILTER
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "", direction: "asc" });
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [filters, setFilters] = useState({ status: "all", role: "all" });
    // EDIT
    const [userToEditId, setUserToEditId] = useState<string>("");
    const [formData, setFormData] = useState({
        email: "",
        firstName: "",
        lastName: ""
    });
    // MODALS
    const [addUserModalOpen, setAddUserModalOpen] = useState<boolean>(false);
    const [editUserModalOpen, setEditUserModalOpen] = useState<boolean>(false);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
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

    const handleEditUser = async (userId: string) => {
        try {
            const res = await fetch(`${backendURL}/users/edit/${userId}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email
                })
            });

            if (res.ok) {
                setUsers(prevUsers => 
                    prevUsers?.map(user => 
                        user.id === userId ? { ...user, first_name: formData.firstName, last_name: formData.lastName, email: formData.email } : user
                    )
                );
                setEditUserModalOpen(false); 

            } else {
                const errorData = await res.json();
                alert(`Greška pri uređivanju: ${errorData.detail}`);
            }
        } catch (error) {
            console.error("Mrežna greška:", error);
        }
    };

    
    // FILTERING
    const handleFilterChange = (category: "status" | "role", value: string) => {
        setFilters(prev => ({
            ...prev,
            [category]: value
        }));
    };
    
    const handleClearFilters = () => {
        setFilters({ status: "all", role: "all" });
    };
    
    const filteredUsers = users?.filter(user => {
        const matchesSearch = 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesStatus = true;
        if (filters.status === "active") matchesStatus = user.is_active === true;
        if (filters.status === "inactive") matchesStatus = user.is_active === false;
        
        let matchesRole = true;
        if (filters.role !== "all") {
            matchesRole = user.roles.includes(filters.role);
        }
        
        return matchesSearch && matchesStatus && matchesRole;
    });
    

    // SORT
    const requestSort = (key: keyof User) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...(filteredUsers || [])].sort((a, b) => {
        if (sortConfig.key === "") return 0;
        
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
    });
    
    return (
        <div className="flex w-full h-screen bg-gray-700 text-gray-100 overflow-hidden">
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
                    <button onClick={() => setAddUserModalOpen(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-blue-500 hover:cursor-pointer text-white px-4 py-2 rounded-lg transition-all font-medium">
                        <UserPlus01 className="w-5 h-5" />
                        Dodaj korisnika
                    </button>
                </header>

                {/* Search Bar & Filter */}
                <div className="flex items-center gap-4 shrink-0">
                    <div className="relative w-full max-w-md">
                        <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Pretraži po imenu ili mailu..." 
                            className="w-full bg-gray-700 border border-gray-500 rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <FilterDropdown filters={filters} onFilterChange={(status, role) => handleFilterChange(status, role)} onClearAll={handleClearFilters} />                    
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-800 shadow-xl flex flex-col flex-1 min-h-0">
                    {/* Table Header */}
                    <div className="grid grid-cols-6 p-4 bg-gray-750 border-b border-gray-700 text-sm font-bold text-gray-400 uppercase tracking-wider select-none">
                        <div onClick={() => requestSort("first_name")} className="col-span-1 flex items-center"
                        >
                            Ime i prezime {sortConfig.key === "first_name" ? (sortConfig.direction === "asc" ? <ChevronUp className="scale-70"/> : <ChevronDown className="scale-70"/>) : <ChevronSelectorVertical className="scale-70"/>}
                        </div>
                        <div onClick={() => requestSort("email")} className="col-span-1 flex items-center">Email {sortConfig.key === "email" ? (sortConfig.direction === "asc" ? <ChevronUp className="scale-70"/> : <ChevronDown className="scale-70"/>) : <ChevronSelectorVertical className="scale-70"/>}</div>
                        <div className="col-span-1 flex justify-center items-center">Status</div>
                        <div className="col-span-1 flex items-center">Uloge</div>
                    </div>

                    {/* Table Body */}
                    <div className="overflow-y-scroll h-full">
                        {sortedUsers?.length === 0 && <div className="flex justify-center items-center h-full"><p className="text-gray-300 p-4">Nema korisnika.</p></div>}
                        {sortedUsers?.map((user) => (
                            <div key={user.id} className="grid grid-cols-6 p-4 items-center hover:bg-gray-750 border-b border-gray-700/50 transition-colors">
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
                                        <button onClick={() => handleDeactivate(user)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/20 hover:cursor-pointer text-red-400 rounded-lg transition-all" title="Deaktiviraj">
                                            {/* <XCircle className="w-5 h-5 text-red-400" /> */}
                                            <span className="text-sm">Deaktiviraj</span>
                                        </button>
                                    ) : (
                                        <button onClick={() => handleReactivate(user)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-green-500/10 hover:cursor-pointer text-green-400 rounded-lg transition-all" title="Aktiviraj">
                                            {/* <CheckCircle className="w-5 h-5" /> */}
                                            <span className="text-sm">Aktiviraj</span>
                                        </button>
                                    )}

                                    <button onClick={() => {setEditUserModalOpen(true); setFormData({firstName: user.first_name, lastName: user.last_name, email: user.email}); setUserToEditId(user.id)}} className="p-2 hover:bg-gray-700 hover:cursor-pointer rounded-lg text-gray-500 transition-colors" title="Uredi">
                                        <Edit01 className="w-5 h-5" />
                                    </button>

                                    <button className="p-2 hover:bg-gray-700 hover:cursor-pointer rounded-lg text-gray-500 transition-colors" title="Obriši trajno">
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
            <Modal isOpen={editUserModalOpen} onClose={() => setEditUserModalOpen(false)} title="Uredi korisnika">
                <div className="flex flex-col w-full gap-2">
                    <input 
                        type="text" 
                        placeholder="Ime" 
                        name="firstName" 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        className={"p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"}/>
                    <input 
                        type="text" 
                        placeholder="Prezime" 
                        name="lastName" 
                        value={formData.lastName} 
                        onChange={handleChange} 
                        className={"p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"}/>
                    <input 
                        type="email" 
                        placeholder="Email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        className={"p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"}/>

                    <button onClick={() => handleEditUser(userToEditId)} className="bg-orange-500 p-2 rounded hover:cursor-pointer">
                        Potvrdi
                    </button>
                </div>
            </Modal>
            {/* <Modal>
                
            </Modal> */}
        </div>
    );
};

export default AdminDashboard;
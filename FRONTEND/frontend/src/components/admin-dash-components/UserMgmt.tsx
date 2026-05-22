import { UserPlus01, SearchMd, ChevronUp, ChevronDown, ChevronSelectorVertical, Edit01, Trash01 } from "@untitledui/icons";
import { FilterDropdown } from "../UI/FilterDropdown";
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../UI/Modal";
import { Register } from "../../pages/Register";
import { apiRequest } from "../../services/api";

interface User {
    id: string; 
    first_name: string;
    last_name: string; 
    email: string;
    is_active: boolean;
    roles: string[];
    institution_id: string;
}

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

interface Institution {
    id: string;
    name: string;
}


type SortConfig = { key: keyof User | ""; direction: "asc" | "desc" };

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const UserMgmt = () => {
    const [users, setUsers] = useState<User[]>();
    const [institutions, setInstitutions] = useState<Institution[]>([]);

    // SORT, SEARCH AND FILTER
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "", direction: "asc" });
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [filters, setFilters] = useState({ status: "all", role: "all" });

    // EDIT
    const [userToEditId, setUserToEditId] = useState<string>("");
    const [formData, setFormData] = useState({
        email: "",
        firstName: "",
        lastName: "",
        institution_id: "",
        roles: [""]
    });

    // DELETE
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // MODALS
    const [addUserModalOpen, setAddUserModalOpen] = useState<boolean>(false);
    const [editUserModalOpen, setEditUserModalOpen] = useState<boolean>(false);
    const [deleteUserModalOpen, setDeleteUserModalOpen] = useState<boolean>(false);

    const token = useAuthStore((state) => state.token);

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

        fetchUsers();
        fetchInstitutions();

    }, [token]);


    const handleDeactivate = async (targetUser : User) => {
        try {
            // const res = await fetch(`${backendURL}/auth/deactivate?user_id=${targetUser?.id}`, {
            //     method: "POST",
            //     headers: { 
            //         "Content-Type": "application/json", 
            //         "Authorization": `Bearer ${token}` 
            //     },
            // });
            const res = await apiRequest(`/auth/deactivate?user_id=${targetUser.id}`, {
                method: "POST"
            });
        
            if (res && res.ok) {
                setUsers(prevUsers => 
                    prevUsers?.map(user => 
                        user.id === targetUser.id ? { ...user, is_active: false } : user
                    )
                );
            } else if (res) {
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
    };

    const handleEditUser = async (userId: string) => {
        try {
            const res = await apiRequest(`/users/edit/${userId}`, {
                method: "PATCH",
                body: JSON.stringify({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    roles: formData.roles,
                    institution_id: formData.institution_id === "" ? null : formData.institution_id
                })
            });

            if (res && res.ok) {
                setUsers(prevUsers => 
                    prevUsers?.map(user => 
                        user.id === userId ? { 
                            ...user, 
                            first_name: formData.firstName, 
                            last_name: formData.lastName, 
                            email: formData.email, 
                            roles: formData.roles, 
                            institution_id: formData.institution_id 
                        } : user
                    )
                );

                setEditUserModalOpen(false); 

            } else if (res) {
                const errorData = await res.json();
                alert(`Greška pri uređivanju: ${errorData.detail}`);
            }
        } catch (error) {
            console.error("Mrežna greška:", error);
        }
    };

    const handleDeleteUser = async (targetUser: User) => {
        try {
            const res = await fetch(`${backendURL}/users/delete/${targetUser.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                setUsers(prevUsers => prevUsers?.filter(user => user.id !== targetUser.id));
                setDeleteUserModalOpen(false);
            } else {
                const errorData = await res.json();
                alert(`Greška: ${errorData.detail}`);
            }
        } catch (error) {
            console.error("Greška pri brisanju:", error);
            alert("Došlo je do pogreške pri komunikaciji s poslužiteljem.");
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

    const roleStyles: Record<string, string> = {
        admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        examinee: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        expert: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        teacher: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        default: "bg-gray-500/10 text-gray-400 border-gray-500/20"
    };

    const availableRoles = [
        { id: "admin", label: "Administrator" },
        { id: "examinee", label: "Ispitanik" },
        { id: "expert", label: "Stručnjak" },
        { id: "teacher", label: "Nastavnik" }
    ];

    const handleRoleToggle = (roleId: string) => {
        setFormData(prev => {
            const isExaminee = roleId === "examinee";
            const alreadyHasRole = prev.roles.includes(roleId);

            if (isExaminee) {
                return {
                    ...prev,
                    roles: alreadyHasRole ? [] : ["examinee"]
                };
            } else {
                let newRoles = prev.roles.filter(r => r !== "examinee");
                
                if (alreadyHasRole) {
                    newRoles = newRoles.filter(r => r !== roleId);
                } else {
                    newRoles = [...newRoles, roleId];
                }

                return { ...prev, roles: newRoles };
            }
        });
    };

    return(
        <>
        {/* Main Content */}
            <div className="w-4/5 p-10 flex flex-col gap-6 h-full">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-semibold">Upravljanje korisnicima</h1>
                        <p className="text-gray-400">Pregled, uređivanje i aktivacija korisničkih računa.</p>
                    </div>
                    <button onClick={() => setAddUserModalOpen(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 hover:cursor-pointer text-white px-4 py-2 rounded-lg transition-all font-medium">
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
                                <div className="text-gray-400 truncate pr-4 flex gap-1 col-span-2">
                                    {user.roles.map((role, idx) => {
                                        const colorClasses = roleStyles[role] || roleStyles.default;
                                        return(
                                            <span key={idx} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colorClasses}`}>
                                                {role}
                                            </span>
                                        )
                                    })}
                                </div>
                                <div className="col-span-1 flex justify-end gap-2 px-2">
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

                                    <button onClick={() => {
                                            setFormData({firstName: user.first_name, lastName: user.last_name, email: user.email, roles: user.roles, institution_id: user.institution_id || ""}); 
                                            setUserToEditId(user.id);
                                            setEditUserModalOpen(true); 
                                        }} className="p-2 hover:bg-gray-700 hover:cursor-pointer rounded-lg text-gray-500 transition-colors" title="Uredi">
                                        <Edit01 className="w-5 h-5" />
                                    </button>

                                    <button onClick={() => {setDeleteUserModalOpen(true); setUserToDelete(user)}} className="p-2 hover:bg-gray-700 hover:cursor-pointer rounded-lg text-gray-500 transition-colors" title="Obriši trajno">
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
                    <label className="text-gray-600">
                        Ime
                        <input 
                            type="text" 
                            placeholder="Ime" 
                            name="firstName" 
                            value={formData.firstName} 
                            onChange={handleChange} 
                            className={"p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"}/>
                    </label>
                    <label className="text-gray-600">
                        Prezime
                        <input 
                            type="text" 
                            placeholder="Prezime" 
                            name="lastName" 
                            value={formData.lastName} 
                            onChange={handleChange} 
                            className={"p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"}/>
                    </label>
                    <label className="text-gray-600">
                        Email
                        <input 
                            type="email" 
                            placeholder="Email" 
                            name="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            className={"p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"}/>
                    </label>

                    <label className="text-gray-600">Uloge</label>
                    <div className="flex gap-3">
                        {availableRoles.map(role => {
                            const isActive = formData.roles.includes(role.id);    
                            const isDisabled = formData.roles.includes("examinee") && role.id !== "examinee";
                            const isExamineeDisabled = !formData.roles.includes("examinee") && formData.roles.length > 0 && !formData.roles.includes("") && role.id === "examinee";

                            return (
                            <div
                                key={role.id}                                    
                                onClick={() => handleRoleToggle(role.id)}
                                className={`
                                    px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer
                                    ${isActive
                                        ? "border-orange-500 bg-orange-500/10 text-orange-500 shadow-sm" 
                                        : "border-gray-400 bg-transparent text-gray-500 hover:border-gray-300"
                                    }
                                    ${(isDisabled || isExamineeDisabled) ? "opacity-50" : "opacity-100"}
                                `}
                            >
                                <p>{role.label}</p>
                            </div>
                        )})}
                    </div>

                    {(formData.roles.includes("teacher") || formData.roles.includes("examinee")) && 
                        <select 
                            name="institution_id"
                            className="my-3 p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded text-sm outline-none focus:ring-2 focus:ring-orange-500"
                            value={formData.institution_id}
                            onChange={handleChange}
                        >
                            <option value="">Odaberite ustanovu</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    }

                    <button onClick={() => handleEditUser(userToEditId)} className="bg-orange-500 p-2 rounded hover:cursor-pointer">
                        Potvrdi
                    </button>
                </div>
            </Modal>
            <Modal isOpen={deleteUserModalOpen} onClose={() => setDeleteUserModalOpen(false)} title={`Izbrisati korisnika ${userToDelete?.email}`}>
                <div className='flex justify-center w-full'>
                    <button 
                        onClick={userToDelete ? () => handleDeleteUser(userToDelete) : () => undefined}
                        className={"bg-red-600 w-1/4 p-3 hover:cursor-pointer rounded-lg flex items-center justify-center gap-2 border transition"}
                    >
                        Potvrdi
                    </button>
                </div>
            </Modal>
        </>
    )
}
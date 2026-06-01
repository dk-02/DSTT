import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { ArrowNarrowLeft } from "@untitledui/icons";
import { Modal } from "../components/UI/Modal";
import { useState } from "react";
import { useCaseStore } from "../store/useCaseStore";
import { useRole } from "../hooks/useRole";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface FormData {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

function Profile() {
    const [deactivateModalOpen, setDeactivateModalOpen] = useState<boolean>(false);
    const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);

    const [formData, setFormData] = useState<FormData>({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: ""
    });
    
    const { isExaminee, isAdmin, isExpert, isTeacher } = useRole();
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const { logout } = useAuthStore();

    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
    };


    const handleLogout = () => {
        if (!isExaminee) {
            if(!window.confirm("Odjavom se poništavaju svi nespremljeni podatci (npr. u kreatoru slučaja). Želite li nastaviti?")) return;
        }
        useCaseStore.getState().clearCaseData();
        logout();
        navigate("/user/login");
    }

    const handleDeactivate = async () => {
        try {
            const res = await fetch(`${backendURL}/auth/deactivate?user_id=${user?.id}`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                },
            });
        
            if (res.ok) {
                alert("Profil uspješno deaktiviran.");

                logout();
                navigate("/user/login");
            } else {
                const errorData = await res.json();
                alert(`Greška: ${errorData.detail}`);
            }

        } catch (error) {
            console.error(error);
            alert("Došlo je do pogreške pri povezivanju s poslužiteljem.");
        }
    }

    const handleChangePassword = async () => {
        if (formData.newPassword !== formData.confirmNewPassword) {
            alert("Nove lozinke se ne podudaraju!");
            return;
        }

        try {
            const res = await fetch(`${backendURL}/auth/change-password`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    old_password: formData.oldPassword,
                    new_password: formData.newPassword
                })
            });

            if (res.ok) {
                alert("Lozinka je promijenjena!");
                setFormData({
                    oldPassword: "",
                    newPassword: "",
                    confirmNewPassword: ""
                });
                setChangePasswordModalOpen(false);
            } else {
                const errorData = await res.json();
                alert(errorData.detail || "Došlo je do pogreške.");
            }
        } catch (error) {
            console.error(error);
            alert("Pogreška u komunikaciji s poslužiteljem.");
        }
    }

    const passwordChangeInputs = [
        {
            label: "Stara lozinka",
            name: "oldPassword",
            value: formData.oldPassword

        }, 
        {
            label: "Nova lozinka",
            name: "newPassword",
            value: formData.newPassword
        },
        {
            label: "Potvrdi novu lozinku",
            name: "confirmNewPassword",
            value: formData.confirmNewPassword
        }
    ]

    return(
        <div className="flex justify-center items-center w-screen h-screen bg-gray-700 text-white relative">
            <ArrowNarrowLeft onClick={() => navigate("/user/dashboard")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <div className="w-1/4 p-10 bg-gray-800  h-full flex flex-col justify-between items-center">
                <div className="flex flex-col items-center gap-5 w-full">
                    <div className="flex items-center justify-center w-40 h-40 text-5xl bg-gray-900 border-4 border-gray-700 shadow-xl font-bold rounded-full relative">
                        <span className="select-none text-gray-100">{user?.first_name?.at(0)?.toUpperCase()}{user?.last_name?.at(0)?.toUpperCase()}</span>
                        <div className="absolute bottom-2 right-4 w-5 h-5 bg-green-500 border-4 border-gray-800 rounded-full"></div>
                    </div>
                    {/* {isExaminee ?                         
                        <div className="flex gap-3 text-xl w-full">
                            <div className="flex flex-col justify-center items-center border border-gray-600 bg-gray-700/50 w-[50%] h-24 rounded-xl shadow-sm">
                                <span className="flex items-end text-xl h-1/2 font-black text-orange-400">{user?.xp_points || 0}</span>
                                <span className="text-[10px] h-1/2 text-gray-400 uppercase font-bold tracking-widest mt-1">XP Bodova</span>
                            </div>
                            <div className="flex flex-col justify-center items-center border border-gray-600 bg-gray-700/50 w-[50%] h-24 rounded-xl shadow-sm px-2 text-center">
                                <span className="flex items-end text-lg h-1/2 font-black text-blue-400 leading-tight">
                                    {user?.expertise_level === "novice" ? "POČETNIK" : user?.expertise_level === "intermediate" ? "NAPREDNI" : "STRUČNJAK"}
                                </span>
                                <span className="text-[10px] h-1/2 text-gray-400 uppercase font-bold tracking-widest mt-1">Razina</span>
                            </div>
                        </div>
                                
                        : <></>
                    } */}
                        <div className="w-full flex flex-col gap-3 mt-5">
                            {isExaminee && 
                                <div className="w-full flex flex-col gap-3">
                                    <div className={"flex justify-center items-center border w-full py-3 rounded-xl shadow-sm bg-green-500/10 border-green-500/30"}>
                                        <span className={"text-sm font-bold uppercase tracking-widest text-green-400"}>
                                            Ispitanik/student
                                        </span>
                                    </div>
                                </div>
                            }

                            {isAdmin && 
                                <div className="w-full flex flex-col gap-3">
                                    <div className={"flex justify-center items-center border w-full py-3 rounded-xl shadow-sm bg-purple-500/10 border-purple-500/30"}>
                                        <span className={"text-sm font-bold uppercase tracking-widest text-purple-400"}>
                                            Administrator
                                        </span>
                                    </div>
                                </div>
                            }

                            {isTeacher && 
                                <div className="w-full flex flex-col gap-3">
                                    <div className={"flex justify-center items-center border w-full py-3 rounded-xl shadow-sm bg-blue-500/10 border-blue-500/30"}>
                                        <span className={"text-sm font-bold uppercase tracking-widest text-blue-400"}>
                                            Nastavnik 
                                        </span>
                                    </div>
                                </div>
                            }
                            
                            {isExpert && 
                                <div className="w-full flex flex-col gap-3">
                                    <div className={"flex justify-center items-center border w-full py-3 rounded-xl shadow-sm bg-orange-500/10 border-orange-500/30"}>
                                        <span className={"text-sm font-bold uppercase tracking-widest text-orange-400"}>
                                            Stručnjak
                                        </span>
                                    </div>
                                </div>
                            }
                            
                            
                        </div>
                        
                </div>

                <div className="w-full">
                    <button onClick={handleLogout} className="w-full bg-gray-700 px-3 py-2 rounded-md hover:bg-gray-600 hover:cursor-pointer">Odjavi se</button>
                </div>
            </div>

            <div className="w-3/4 p-10">
                <div className="w-1/3 flex flex-col text-lg">
                    <span className="text-sm text-gray-300 mb-3">Email</span>
                    <span>{user?.email}</span>

                    <div className="border-b-2 border-b-gray-600 my-5" />

                    <span className="text-sm text-gray-300 mb-3">Ime</span>
                    <span>{user?.first_name}</span>

                    <span className="text-sm text-gray-300 mb-3 mt-5">Prezime</span>
                    <span>{user?.last_name}</span>
                </div>

                <div className="w-1/3 border-b-2 border-b-gray-600 my-5" />

                <div className="w-1/3 flex flex-col gap-2">
                    <span className="text-sm text-gray-300 mb-2">Upravljanje podatcima</span>
                    <button onClick={() => setChangePasswordModalOpen(true)} className="cursor-pointer border border-gray-600 font-semibold px-3 py-2 rounded">Promijeni lozinku</button>
                    <button onClick={() => setDeactivateModalOpen(true)} className="cursor-pointer border border-gray-600 font-semibold px-3 py-2 rounded text-red-400">Deaktiviraj račun</button>
                </div>
            </div>            
            
            <Modal
                isOpen={changePasswordModalOpen}
                onClose={() => setChangePasswordModalOpen(false)}
                title="Promjena lozinke"
            >
                <div className="w-full flex flex-col items-center gap-3">
                    {passwordChangeInputs.map((i, idx) => (
                        <div key={idx} className="relative flex items-center w-1/2">
                            <input 
                                type={"password"} 
                                placeholder={i.label} 
                                name={i.name} 
                                value={i.value}
                                onChange={handleChange} 
                                className="p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"
                            />
                        </div>
                    ))}
                    <button onClick={handleChangePassword} className="cursor-pointer border bg-red-600 font-semibold px-3 py-2 rounded-md">Potvrdi</button>
                </div>
            </Modal>

            <Modal
                isOpen={deactivateModalOpen}
                onClose={() => setDeactivateModalOpen(false)}
                title="Deaktivirati račun?"
            >
                <div className="w-full flex justify-center">
                    <button onClick={handleDeactivate} className="cursor-pointer border bg-red-600 font-semibold px-3 py-2 rounded-md">Potvrdi</button>
                </div>
            </Modal>
        </div>
    );
}

export default Profile;
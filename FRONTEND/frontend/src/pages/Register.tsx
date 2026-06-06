import { useEffect, useState } from "react";
import { ArrowNarrowLeft, Check, Eye, EyeOff, HelpCircle, XClose } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Tooltip, TooltipTrigger } from "../components/base/tooltip/tooltip";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface RegisterProps {
    isAdminMode?: boolean;
    onSuccess?: () => void;
}

interface Institution {
    id: string;
    name: string;
    domain: string;
}

export const Register = ({ isAdminMode = false, onSuccess } : RegisterProps) => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        institution_id: "",
        roles: [""]
    });

    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();

    const availableRoles = [
        { id: "admin", label: "Administrator" },
        { id: "examinee", label: "Ispitanik" },
        { id: "expert", label: "Stručnjak" },
        { id: "teacher", label: "Nastavnik" }
    ];


    useEffect(() => {
        if (isAdminMode) {
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
                    } else {
                        console.error("Neuspješno dohvaćanje institucija");
                    }
                } catch (error) {
                    console.error("Greška pri dohvaćanju institucija:", error);
                }
            };

            fetchInstitutions();
        }
    }, [isAdminMode, token]);


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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        

        setFormData((prev) => {
            const updatedData = {
                ...prev,
                [name]: value 
            };

            if (isAdminMode && name === "email" && value.includes("@")) {
                const parts = value.split("@");
                
                if (parts.length === 2) {
                    const typedDomain = parts[1].toLowerCase();
                    
                    const matchedInstitution = institutions.find(inst => inst.domain === typedDomain);
                    
                    if (matchedInstitution) {
                        updatedData.institution_id = matchedInstitution.id;
                    }
                }
            }

            return updatedData;
        });
        // setFormData((prev) => ({
        //     ...prev,
        //     [name]: value 
        // }));
    };

    const handleRegister = async () => {
        const endpoint = isAdminMode ? `${backendURL}/auth/admin-register` : `${backendURL}/auth/register`;

        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (isAdminMode && token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const body = isAdminMode 
            ? JSON.stringify({ 
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName,
                institution_id: formData.institution_id === "" ? null : formData.institution_id,
                roles: formData.roles
            })
            : JSON.stringify({ 
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName
            });

        const res = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (res.ok) {            
            if (isAdminMode && onSuccess) {
                onSuccess();
            } else {
                navigate("/user/login");
            }
        } else {
            const errorData = await res.json();
            alert(`Registracija neuspješna: ${errorData.detail || "Nepoznata greška"}`);
        }
    };

    const togglePassword = () => {
        setPasswordVisible(prev => !prev);
    }

    const passwordChecks = {
        hasMinLength: formData.password.length >= 8,
        hasUpperCase: /[A-Z]/.test(formData.password),
        hasLowerCase: /[a-z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_+\-[\]/\\]/.test(formData.password),
    };

    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    const containerClasses = isAdminMode 
        ? "w-full p-2 text-white"
        : "flex justify-center items-center w-full h-screen bg-gray-800 relative";

    const formClasses = isAdminMode
        ? "w-full flex flex-col gap-4"
        : "w-1/4 flex flex-col gap-4 p-10 bg-gray-700 text-white rounded-xl shadow-2xl";

    const inputClasses = isAdminMode
        ? "p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"
        : "p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none";

    return (
        <div className={containerClasses}>
            {!isAdminMode && (
                <ArrowNarrowLeft 
                    onClick={() => navigate("/")} 
                    className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" 
                />
            )}
            <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className={formClasses}>
                {!isAdminMode && (
                    <div className="border-l-3 border-orange-400 flex items-center pl-2 mb-5">
                        <h2 className="font-bold text-2xl">Registracija</h2>
                    </div>
                )}
                <input 
                    type="text" 
                    placeholder="Ime" 
                    name="firstName" 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    className={inputClasses}/>
                <input 
                    type="text" 
                    placeholder="Prezime" 
                    name="lastName" 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    className={inputClasses}/>
                <input 
                    type="email" 
                    placeholder="Email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    className={inputClasses}/>
                <div className="relative flex items-center">
                    <input 
                        type={passwordVisible ? "text" : "password"} 
                        placeholder="Lozinka" 
                        name="password" 
                        value={formData.password}
                        onChange={handleChange} 
                        className={`${inputClasses} w-full`}
                    />

                    {passwordVisible ? <EyeOff className={`${isAdminMode && 'text-gray-500'} absolute right-2 hover:cursor-pointer`} onClick={togglePassword} /> : <Eye className={`${isAdminMode && 'text-gray-500'} absolute right-2 hover:cursor-pointer`} onClick={togglePassword} />}

                </div>

                {formData.password.length > 0 && (
                    <div className={`${isAdminMode ? "bg-gray-200/50" : "bg-gray-800/40"} p-3 rounded-lg border border-gray-600/40 space-y-1.5 text-xs animate-fadeIn`}>
                        <p className={`font-semibold ${isAdminMode ? "text-gray-600" : "text-gray-400"}  mb-2`}>Sigurnost lozinke:</p>
                        
                        {[
                            { checked: passwordChecks.hasMinLength, label: "Minimalno 8 znakova" },
                            { checked: passwordChecks.hasUpperCase, label: "Barem jedno veliko slovo (A-Z)" },
                            { checked: passwordChecks.hasLowerCase, label: "Barem jedno malo slovo (a-z)" },
                            { checked: passwordChecks.hasNumber, label: "Barem jedan broj (0-9)" },
                            { checked: passwordChecks.hasSpecialChar, label: "Barem jedan posebni znak (npr. !, @, #, $)" },
                        ].map((rule, index) => (
                            <div key={index} className="flex items-center gap-2 transition-all">
                                <span className={`font-bold ${rule.checked ? "text-green-400" : "text-red-400"}`}>
                                    {rule.checked ? <Check className="w-5" /> : <XClose className="w-5" />}
                                </span>
                                <span className={rule.checked ? (isAdminMode ? "text-gray-400" : "text-gray-300") : (isAdminMode ? "text-gray-600" : "text-gray-400")}>
                                    {rule.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {isAdminMode && (
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uloge</label>
                            <Tooltip style={{ backgroundColor: "#6a7282", borderRadius: "6px" }} placement="top left" title="Ispitanik ne može imati nijednu drugu ulogu.">
                                <TooltipTrigger className="group relative flex cursor-pointer flex-col items-center gap-2 text-gray-600 transition duration-100 ease-linear hover:text-gray-700 focus:text-gray-700">
                                    <HelpCircle className="size-4 text-gray-500" />
                                </TooltipTrigger>
                            </Tooltip>
                        </div>
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
                                className="p-2 bg-gray-200 text-gray-600 border border-gray-400 rounded text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
                        
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={!isPasswordValid || !formData.email || !formData.firstName || !formData.lastName}
                    className="disabled:bg-gray-500 disabled:cursor-not-allowed bg-orange-500 p-2 rounded hover:cursor-pointer"
                >
                    {isAdminMode ? "Kreiraj račun" : "Registriraj se"}
                </button>
            </form>
        </div>
    );
};
import { useState } from "react";
import { ArrowNarrowLeft, Eye, EyeOff } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface RegisterProps {
    isAdminMode?: boolean;
    onSuccess?: () => void;
}

export const Register = ({ isAdminMode = false, onSuccess } : RegisterProps) => {
    const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: ""
    });

    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        setFormData((prev) => ({
            ...prev,
            [name]: value 
        }));
    };

    const handleRegister = async () => {
        const res = await fetch(`${backendURL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName
            })
        });

        if (res.ok) {            
            if (isAdminMode && onSuccess) {
                onSuccess();
            } else {
                navigate("/user/login");
            }
        } else {
            alert("Registracija neuspješna");
        }
    };

    const togglePassword = () => {
        setPasswordVisible(prev => !prev);
    }

    const containerClasses = isAdminMode 
        ? "w-full p-2 text-white"
        : "flex justify-center items-center w-full h-screen bg-gray-700 relative";

    const formClasses = isAdminMode
        ? "w-full flex flex-col gap-4"
        : "w-1/4 flex flex-col gap-4 p-10 bg-gray-600 text-white rounded-xl shadow-2xl";

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
            <div className={formClasses}>
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
                <button onClick={handleRegister} className="bg-orange-500 p-2 rounded hover:cursor-pointer">
                    {isAdminMode ? "Kreiraj račun" : "Registriraj se"}
                </button>
            </div>
        </div>
    );
};
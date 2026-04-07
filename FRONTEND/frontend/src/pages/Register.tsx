import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const Register = () => {
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

    const setAuth = useAuthStore(state => state.setAuth);

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
            const data = await res.json();
            setAuth(data.access_token, data.user);
            alert("Dobrodošli!");
            navigate("/user/login");
        } else {
            alert("Registracija neuspješna");
        }
    };

    const togglePassword = () => {
        setPasswordVisible(prev => !prev);
    }

    return (
        <div className="flex justify-center items-center w-full h-screen bg-gray-700">
            <div className="w-1/4 flex flex-col gap-4 p-10 bg-gray-600 text-white rounded-xl shadow-2xl">
                <div className="border-l-3 border-orange-400 flex items-center pl-2 mb-5">
                    <h2 className="font-bold text-2xl">Registracija</h2>
                </div>
                <input 
                    type="text" 
                    placeholder="Ime" 
                    name="firstName" 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    className="p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"/>
                <input 
                    type="text" 
                    placeholder="Prezime" 
                    name="lastName" 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    className="p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"/>
                <input 
                    type="email" 
                    placeholder="Email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    className="p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"/>
                <div className="relative flex items-center">
                    <input 
                        type={passwordVisible ? "text" : "password"} 
                        placeholder="Lozinka" 
                        name="password" 
                        value={formData.password}
                        onChange={handleChange} 
                        className="p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none w-full"
                    />

                    {passwordVisible ? <EyeOff className="absolute right-2 hover:cursor-pointer" onClick={togglePassword} /> : <Eye className="absolute right-2 hover:cursor-pointer" onClick={togglePassword} />}

                </div>
                <button onClick={handleRegister} className="bg-orange-500 p-2 rounded hover:cursor-pointer">Registriraj se</button>
            </div>
        </div>
    );
};
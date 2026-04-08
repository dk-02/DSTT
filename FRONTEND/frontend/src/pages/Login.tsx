import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { EyeOff, Eye, ArrowNarrowLeft } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);

  const navigate = useNavigate();

  const setAuth = useAuthStore(state => state.setAuth);

  const handleLogin = async () => {
    const res = await fetch(`${backendURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const data = await res.json();
      setAuth(data.access_token, data.user);
      alert("Dobrodošli!");
      navigate("/");
    } else {
      alert("Prijava neuspješna");
    }
  };

  const togglePassword = () => {
        setPasswordVisible(prev => !prev);
    }

  return (
    <div className="w-full h-screen bg-gray-700 flex justify-center items-center relative">
        <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
        <div className="flex flex-col w-1/4 gap-4 p-10 bg-gray-600 text-white rounded-xl shadow-2xl">
            <div className="border-l-3 border-orange-400 flex items-center pl-2 mb-5">
                <h2 className="font-bold text-2xl">Prijava</h2>
            </div>
            <input 
              type="email" 
              placeholder="Email" 
              onChange={e => setEmail(e.target.value)} 
              className="p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"
            />

            <div className="relative flex items-center">
              <input 
                type={passwordVisible ? "text" : "password"} 
                placeholder="Lozinka" 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />        

              {passwordVisible ? <EyeOff className="absolute right-2 hover:cursor-pointer" onClick={togglePassword} /> : <Eye className="absolute right-2 hover:cursor-pointer" onClick={togglePassword} />}

            </div>

            <button onClick={handleLogin} className="bg-orange-500 p-2 rounded">Prijavi se</button>
        </div>
    </div>
  );
};
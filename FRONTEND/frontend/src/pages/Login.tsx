import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { EyeOff, Eye, ArrowNarrowLeft } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/UI/Modal";

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState<boolean>(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string>("");

  const navigate = useNavigate();

  const setAuth = useAuthStore(state => state.setAuth);

  const handleLogin = async () => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch(`${backendURL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });
  
      if (res.ok) {
        const data = await res.json();
        setAuth(data.access_token, data.user);
        navigate("/");
      } else {
        if (res.status === 429) {
          alert("Pokušajte ponovno kasnije.")
        } else if (res.status === 400) {
          alert("Račun nije aktivan.");
        } else {
          alert("Prijava neuspješna.");
        }
      }

    } catch (error) {
      console.error(error);
      alert("Došlo je do pogreške pri povezivanju s poslužiteljem.");
    }
  };

  const togglePassword = () => {
    setPasswordVisible(prev => !prev);
  }

  const handleForgotPassword = async (userEmail: string) => {
    if (!userEmail) return;

    try {
        const res = await fetch(`${backendURL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail })
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            setResetPasswordEmail("");
            setResetPasswordModalOpen(false);
        } else {
            alert("Došlo je do pogreške. Pokušajte ponovno.");
        }
    } catch (error) {
        console.error("Greška:", error);
        alert("Povezivanje s poslužiteljem nije uspjelo.");
    }
};

  return (
    <div className="w-full h-screen bg-gray-800 flex justify-center items-center relative">
        <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }} className="flex flex-col w-1/4 p-10 bg-gray-700 text-white rounded-xl shadow-2xl">
            <div className="border-l-3 border-orange-400 flex items-center pl-2 mb-5">
                <h2 className="font-bold text-2xl">Prijava</h2>
            </div>
            <input 
              type="email" 
              placeholder="Email" 
              onChange={e => setEmail(e.target.value)} 
              className="p-2 mb-4 border rounded focus:ring-2 focus:ring-orange-500 outline-none"
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

            {/* <p onClick={() => setResetPasswordModalOpen(true)} className="mt-2 self-end text-sm text-gray-200 hover:text-orange-300 hover:cursor-pointer">Zaboravljena lozinka?</p> */}

            <button onClick={handleLogin} className="bg-orange-500 p-2 rounded hover:cursor-pointer mt-4">Prijavi se</button>
        </form>

        <Modal isOpen={resetPasswordModalOpen} onClose={() => setResetPasswordModalOpen(false)} title="Resetiraj lozinku">
          <div className="flex flex-col gap-4">
            <p>Unesite email korisničkog računa za koji ste zaboravili lozinku.</p>
            <input 
                type="email" 
                placeholder="Email" 
                onChange={e => setResetPasswordEmail(e.target.value)} 
                className="p-2 mb-4 border rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            <button onClick={() => handleForgotPassword(resetPasswordEmail)}>Pošalji</button>
          </div>
        </Modal>
    </div>
  );
};
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [newPassword, setNewPassword] = useState("");
    const navigate = useNavigate();

    const handleReset = async () => {
        const res = await fetch(`${backendURL}/auth/reset-password-confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, new_password: newPassword })
        });

        if (res.ok) {
            alert("Lozinka promijenjena! Možete se prijaviti.");
            navigate("/login");
        } else {
            alert("Link je nevaljan ili je istekao.");
        }
    };

    return (
        <div className="bg-gray-700 h-screen flex flex-col justify-center items-center">
            <h2 className="text-white text-2xl mb-4">Nova lozinka</h2>
            <input 
                type="password" 
                onChange={(e) => setNewPassword(e.target.value)}
                className="p-2 rounded mb-4"
                placeholder="Unesite novu lozinku"
            />
            <button onClick={handleReset} className="bg-orange-500 p-2 rounded text-white">
                Potvrdi promjenu
            </button>
        </div>
    );
};
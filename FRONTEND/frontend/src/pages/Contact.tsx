import { useState } from "react";
import Header from "../components/UI/Header";
import { ArrowNarrowLeft } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

function Contact() {    
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const navigate = useNavigate();

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        
        try {
            const response = await fetch(`${backendURL}/contact/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert("Hvala vam na upitu! Poruka je uspješno poslana.");
                setFormData({ name: "", email: "", subject: "", message: "" });
            } else {
                throw new Error("Greška pri slanju.");
            }
        } catch (error) {
            alert("Došlo je do pogreške pri slanju poruke.");
            console.error(error);
        }
    };

    return (
        <div className="w-screen h-screen bg-gray-700 flex flex-col text-gray-100">
            <Header />
            <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-24 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <main className="flex-1 overflow-y-auto flex items-center justify-center">
                <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-600">
                    
                    {/* LIJEVA STRANA: Informacije */}
                    <div className="flex flex-col justify-center">
                        <h1 className="text-4xl font-bold text-orange-500 mb-4">Kontaktirajte nas</h1>
                        <p className="text-gray-300 mb-8 text-lg">
                            Imate pitanja o DSTT projektu ili želite surađivati? Obratite nam se putem forme ili izravno na e-mail.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm uppercase tracking-widest text-gray-400 font-semibold">Nadležna ustanova</h3>
                                <p className="text-xl text-white">Fakultet elektrotehnike i računarstva</p>
                                <p className="text-gray-300">Sveučilište u Zagrebu</p>
                            </div>

                            <div>
                                <h3 className="text-sm uppercase tracking-widest text-gray-400 font-semibold">Autorica</h3>
                                <p className="text-xl text-white">Dora Kašik</p>
                                <p className="text-gray-300">Diplomski studij, Profil: Programsko inženjerstvo i informacijski sustavi</p>
                            </div>

                            <div>
                                <h3 className="text-sm uppercase tracking-widest text-gray-400 font-semibold">Mentor</h3>
                                <p className="text-xl text-white">dr. sc. Predrag Pale</p>
                                <p className="text-gray-300">Zavod za elektroničke sustave i obradu informacija</p>
                            </div>

                            <div className="flex flex-col">
                                <h3 className="text-sm uppercase tracking-widest text-gray-400 font-semibold">E-mail</h3>
                                <a href="mailto:info@dstt-project.com" className="text-xl text-orange-400 hover:text-orange-300 transition-colors">
                                    dsttproject@outlook.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* DESNA STRANA: Kontakt forma */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-gray-700 p-5 rounded-xl border border-gray-600">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-gray-400 ml-1">Vaše ime</label>
                                <input 
                                    type="text" 
                                    required
                                    className="bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-orange-500 transition-colors"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm text-gray-400 ml-1">E-mail adresa</label>
                                <input 
                                    type="email" 
                                    required
                                    className="bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-orange-500 transition-colors"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400 ml-1">Predmet</label>
                            <input 
                                type="text" 
                                className="bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-orange-500 transition-colors"
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-gray-400 ml-1">Poruka</label>
                            <textarea 
                                rows={4}
                                required
                                className="bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                            ></textarea>
                        </div>

                        <button 
                            type="submit"
                            className="mt-2 cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            Pošalji poruku
                        </button>
                    </form>

                </div>
            </main>
        </div>
    );
};

export default Contact;
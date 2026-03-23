import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Case {
    id: string;
    title: string;
}

const backendURL = import.meta.env.VITE_APP_BACKEND;

function Landing() {
    const [cases, setCases] = useState<Case[]>([]);

    useEffect(() => {
        const fetchCases = async () => {
            const response = await fetch(`${backendURL}/cases`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
            
            const data = await response.json();

            // console.log(data);
            setCases(data);
        };

        fetchCases();
    }, []);


    const navigate = useNavigate();
    

    return(
        <div className="w-screen h-screen p-5 bg-gray-700 text-white">
            <button onClick={() => navigate("/case/create")} className="cursor-pointer bg-green-600 text-orange-50 font-bold px-3 py-2 rounded mb-5">New case</button>

            <h2 className="font-bold">Available cases:</h2>
            <div className="mt-5 flex">
                {cases.map((c) => (
                    <div key={c.id} className="flex flex-col items-center w-64 h-32 rounded shadow-md p-5 bg-gray-600">
                        <h3>{c.title}</h3>
                        <button onClick={() => navigate(`/case/${c.id}`)} className="cursor-pointer bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-2xl">Solve</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Landing;
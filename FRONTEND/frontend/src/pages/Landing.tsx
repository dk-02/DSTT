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
        <div className="w-screen h-screen p-5 bg-blue-100">
            <h2>Available cases:</h2>
            <div className="mt-5 w-64 h-64 border rounded flex flex-col justify-center items-center">
                {cases.map((c) => (
                    <div key={c.id} onClick={() => navigate(`/case/${c.id}`)}>
                        <h3>{c.title}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Landing;
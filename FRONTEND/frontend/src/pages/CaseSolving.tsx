import { ArrowNarrowLeft } from "@untitledui/icons";
import { useEffect, useState, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router-dom";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface userMsg {
    sender: string;
    text: string;
    ddu?: string;
}

interface Case {
    id: string;
    title: string;
    initial_info: string;
}

interface Feedback {
    verdict: string;
    feedback: string;
}

function CaseSolving() {
    const [input, setInput] = useState("");
    const [diagnosis, setDiagnosis] = useState<string>("");
    const [messages, setMessages] = useState<userMsg[]>([]);
    const [caseInfo, setCaseInfo] = useState<Case>();
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const caseId = useParams().id;

    const navigate = useNavigate();

    useEffect(() => {
        const getCaseDetails = async () => {
            const response = await fetch(`${backendURL}/cases/${caseId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
        
            const data = await response.json();
            setCaseInfo(data);
        }

        getCaseDetails();
    }, [caseId])

    const handleSend = async () => {
        const userMsg = { sender: "student", text: input };
        setMessages([...messages, userMsg]);

        const response = await fetch(`${backendURL}/llm/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input, case_id: caseId })
        });
        
        const data = await response.json();
        const aiMsg = { sender: "system", text: data.result, ddu: data.ddu_id };
        setMessages(prev => [...prev, aiMsg]);
        setInput("");
    };

    const handleVerifyDiagnosis = async () => {
        try {
            const response = await fetch(`${backendURL}/llm/verifyDiagnosis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    case_id: caseId,
                    student_diagnosis: diagnosis
                })
            });

            const data = await response.json()

            // console.log(data)

            setFeedback(data);

        } catch(err) {
            console.error(err);
        }
    }

    // Send text to chat with enter
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            handleSend();
        }
    };

    return (
        <div className="p-5 flex w-screen h-screen gap-5 bg-gray-700 relative">
            <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <div className="w-1/3 flex flex-col gap-5 items-center">
                <h1 className="text-orange-400 font-bold text-2xl">{caseInfo?.title}</h1>
                <p className="text-white">{caseInfo?.initial_info}</p>
                <div>
                    {feedback && (
                        <div className={feedback.verdict === "CORRECT" ? "mt-5 p-3 bg-green-200 rounded" : feedback.verdict === "INCORRECT" ? "mt-5 p-3 bg-red-200 rounded" : "mt-5 p-3 bg-orange-200 rounded"}>
                            <strong>{feedback.verdict === "CORRECT" ? "Correct!" : feedback.verdict === "INCORRECT" ? "Incorrect" : "Partially correct"}</strong>
                            <p>{feedback.feedback}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="w-2/3 h-full flex flex-col items-center">
                <div className="h-2/3 border border-gray-400 overflow-y-scroll p-2.5 w-full">
                    {messages.map((m, i) => (
                        <p key={i} className={m.sender === "student" ? "text-orange-400" : "text-gray-100"}>
                            <strong>{m.sender}:</strong> {m.text}
                        </p>
                    ))}
                </div>
                <div className="w-1/2 mt-2 flex gap-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        onKeyDown={handleKeyDown}
                        className="border border-gray-400 rounded px-3 py-2 w-full text-white"
                        placeholder="Ask for DDU..."
                    />
                    <button onClick={handleSend} 
                        className="bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-2xl"
                    >Send</button>
                </div>
                <div className="w-1/2 mt-2 flex gap-2">
                    <input 
                        type="text" 
                        value={diagnosis} 
                        onChange={(e) => setDiagnosis(e.target.value)}
                        className="border border-gray-400 rounded px-3 py-2 w-full text-white"
                        placeholder="Diagnosis attempt..."
                    />
                    <button onClick={handleVerifyDiagnosis} 
                        className="bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-2xl"
                    >Check</button>
                </div>
            </div>
        </div>
    );
}

export default CaseSolving;
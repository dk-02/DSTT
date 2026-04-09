import { ArrowNarrowLeft, File06, Recording01 } from "@untitledui/icons";
import { useEffect, useState, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "../components/UI/Modal";
import { useCaseSolvingStore } from "../store/useCaseSolveStore";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface userMsg {
    sender: string;
    text: string;
    du?: string;
}

interface Media {
    file_path: string;
    file_type: string;
    title: string;
}

interface Case {
    id: string;
    title: string;
    initial_info: string;
    media: Media[];
}

interface Feedback {
    verdict: string;
    feedback: string;
}

interface Hint {
    sequence_no: number;
    text: string;
    cost: number;
}

function CaseSolving() {
    const [input, setInput] = useState("");
    const [diagnosis, setDiagnosis] = useState<string>("");
    const [messages, setMessages] = useState<userMsg[]>([]);
    const [caseInfo, setCaseInfo] = useState<Case>();
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    // Fileovi
    const [viewFileModalOpen, setViewFileModalOpen] = useState<boolean>(false);
    const [viewFile, setViewFile] = useState<Media>();
    const [textContent, setTextContent] = useState<string | null>(null);
    // Hintovi
    const [hints, setHints] = useState<Hint[]>([]);

    const caseId = useParams().id;

    const { attemptId } = useCaseSolvingStore();

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

        const response = await fetch(`${backendURL}/attempts/${attemptId}/getDU`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input, case_id: caseId })
        });
        
        const data = await response.json();
        const aiMsg = { sender: "system", text: data.result, du: data.du_id };
        setMessages(prev => [...prev, aiMsg]);
        setInput("");
    };

    const handleVerifyDiagnosis = async () => {
        try {
            const response = await fetch(`${backendURL}/attempts/${attemptId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
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

    const handleViewFile = async (file: Media) => {
        if (!file) return;

        if (file.file_type === 'text/plain' || file.file_type === 'application/json') {
            try {
                const url = getFileUrl(file.file_path);
                const response = await fetch(url);
                
                if (!response.ok) throw new Error("Neuspjelo učitavanje datoteke");
                
                const text = await response.text(); 
                setTextContent(text);
            } catch (err) {
                console.error("Greška pri čitanju txt datoteke:", err);
                setTextContent("Greška: Nije moguće učitati sadržaj datoteke.");
            }
        } else {
            setTextContent(null);
        }

        setViewFile(file);
        setViewFileModalOpen(true);
    }

    const getFileUrl = (filePath: string) => {
        if (!filePath) return "";
        return `${backendURL}/${filePath}`;
    };

    const handleGetHint = async () => {
        if (!caseId) return;

        try {
            const currentLength = hints.length;
            const response = await fetch(`${backendURL}/cases/${caseId}/hint?sequence_no=${currentLength}`);

            if (!response.ok) {
                if (response.status === 404) {
                    alert("Nema više dostupnih hintova za ovaj slučaj."); 
                } else {
                    throw new Error("Neuspjelo dohvaćanje hinta");
                }
                return;
            }

            const newHint: Hint = await response.json();

            setHints(prev => [...prev, newHint]);

        } catch(err) {
            console.error(err);
        }
    }

    return (
        <div className="p-5 flex w-screen h-screen gap-5 bg-gray-700 relative">
            <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <div className="w-1/3 flex flex-col gap-5 items-center">
                <h1 className="text-orange-400 font-bold text-2xl">{caseInfo?.title}</h1>
                <p className="text-white">{caseInfo?.initial_info}</p>
                <div>
                    {caseInfo?.media.map((m, idx) => (
                        <div key={idx}>
                            {m.file_type.startsWith("image") && (
                                <img src={getFileUrl(m.file_path)} alt="Nalaz" className="w-full h-auto" />
                            )}
                            <button onClick={() => handleViewFile(m)}
                                className="bg-gray-800 text-gray-50 px-3 py-2 rounded"        
                            >Pogledaj datoteku ({m.title})</button>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                    {hints.map((h) => (
                        <div key={h.sequence_no} className="border border-gray-500 bg-gray-600 text-gray-100 px-5 py-2 rounded">
                            <p>
                                <span className="text-orange-300">Hint {h.sequence_no}:</span> {h.text}
                            </p>
                        </div>
                    ))}
                </div>
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
                <div className="w-1/2 mt-2 flex gap-2">
                    <button onClick={handleGetHint} 
                        className="bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-2xl"
                    >Hint</button>
                </div>
            </div>

            <Modal 
                isOpen={viewFileModalOpen} 
                onClose={() => setViewFileModalOpen(false)} 
                title={viewFile?.title || 'Preview'}
            >
                {viewFile && (
                <div className="w-full h-full flex items-center justify-center">
                    {viewFile.file_type === 'text/plain' || viewFile.file_type === 'application/json' ? (
                    <div className="w-full max-h-[70vh] bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                            Text/JSON Document Preview
                        </span>
                        </div>
                        <pre className="p-6 overflow-auto text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-white">
                        {textContent}
                        </pre>
                    </div>
                    ) : viewFile.file_type === 'audio' ? (
                    <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                        <Recording01 className="w-10 h-10 text-orange-600" />
                        </div>
                        
                        <div className="text-center mb-8">
                        <h4 className="text-gray-900 font-semibold mb-1 truncate max-w-xs">
                            {viewFile.title}
                        </h4>
                        {/* <p className="text-sm text-gray-500">Audio datoteka • {(viewFile.size / (1024 * 1024)).toFixed(2)} MB</p> */}
                        </div>

                        <audio 
                        controls 
                        className="w-full h-10 custom-audio-player" 
                        autoPlay={false}
                        >
                        <source src={getFileUrl(viewFile.file_path)} type={viewFile.file_type} />
                        Vaš preglednik ne podržava audio element.
                        </audio>
                        
                        <p className="mt-6 text-[11px] text-gray-400 italic text-center">
                        Pritisnite play za preslušavanje snimke slučaja
                        </p>
                    </div>
                    ) : viewFile.file_type === 'video' ? (
                    <video controls className="max-w-full max-h-full rounded-lg">
                        <source src={getFileUrl(viewFile.file_path)} type={viewFile.file_type} />
                    </video>
                    ) : viewFile.file_type === 'application/pdf' ? (
                    <iframe 
                        src={getFileUrl(viewFile.file_path)} 
                        className="w-full h-[75vh] rounded-lg border border-gray-200 shadow-sm"
                    />
                    ) : (
                    <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
                        <File06 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Preview nije dostupan za ovaj format.</p>
                        <a 
                        href={getFileUrl(viewFile.file_path)} 
                        download={viewFile.title}
                        className="mt-4 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-semibold hover:bg-orange-100 transition-colors inline-block"
                        >
                        Preuzmi datoteku
                        </a>
                    </div>
                    )}
                </div>
                )}
            </Modal>

        </div>
    );
}

export default CaseSolving;
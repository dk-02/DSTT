import { ArrowNarrowLeft, Clock, File06, Recording01, ReverseLeft } from "@untitledui/icons";
import { useEffect, useState, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "../components/UI/Modal";
import { useAuthStore } from "../store/useAuthStore";
import { useCaseSolvingStore } from "../store/useCaseSolveStore";
import { jwtDecode } from "jwt-decode";

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface userMsg {
  sender: 'korisnik' | 'llm-mentor' | 'sustav';
  text: string;
  du?: string;
  media?: Media[];
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
}

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

interface Settings {
    enable_hints: boolean;
    ignore_hint_penalty: boolean;
    enable_undo: boolean;
    enable_LLM_mentor: boolean;
    ignore_terminating_consequences: boolean;
    show_result_immediately: boolean;
    allow_diagnosis_retry: boolean;
    penalize_wrong_diagnosis: boolean;
}

function CaseSolving() {
    const [input, setInput] = useState<string>("");
    const [diagnosis, setDiagnosis] = useState<string>("");
    const [caseInfo, setCaseInfo] = useState<Case>();
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const [settings, setSettings] = useState<Settings | null>(null);
    const [attemptStatus, setAttemptStatus] = useState<string>("in_progress");
    const [startedAt, setStartedAt] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>("00:00");

    // FILEOVI
    const [viewFileModalOpen, setViewFileModalOpen] = useState<boolean>(false);
    const [viewFile, setViewFile] = useState<Media>();
    const [textContent, setTextContent] = useState<string | null>(null);
    
    const attemptId = useParams().id;
    const [caseId, setCaseId] = useState<string | null>(null);

    // CANCEL
    const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);

    const [isStoreReady, setIsStoreReady] = useState(false);

    const navigate = useNavigate();

    const token = useAuthStore((state) => state.token);
    const { unlockedHints, addHint, reset, messages, addMessage, setAttempt, undoLastAction } = useCaseSolvingStore();

    useEffect(() => {
        const fetchIds = async () => {
            const attRes = await fetch(`${backendURL}/attempts/${attemptId}/details`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const attemptData = await attRes.json();
            setCaseId(attemptData.case_id);

            setSettings(attemptData.settings);
            setAttemptStatus(attemptData.status);
            setStartedAt(new Date(attemptData.started_at));

            setAttempt(attemptData.id, attemptData.started_at);

            const caseRes = await fetch(`${backendURL}/cases/${attemptData.case_id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (caseRes.ok) {
                const caseData = await caseRes.json();
                setCaseInfo(caseData);
            } else {
                console.error("Greška pri dohvaćanju detalja slučaja.");
            }
        };

        if (attemptId) fetchIds();

    }, [attemptId, token, setAttempt]);


    useEffect(() => {
        if (!caseId || !token) return;

        const decoded: MyTokenPayload = jwtDecode(token);
        const userId = decoded.sub;

        const storageKey = `case-solve-${caseId}-${userId}`;
        useCaseSolvingStore.persist.setOptions({ name: storageKey });

        useCaseSolvingStore.persist.rehydrate();
        
        setIsStoreReady(true);

        return () => {
            setIsStoreReady(false);
        };
    }, [caseId, token]);


    useEffect(() => {
        if (!startedAt || attemptStatus !== "in_progress") return;

        const interval = setInterval(() => {
            const now = new Date();
            const diffSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
            
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60).toString().padStart(2, '0');
            const seconds = (diffSeconds % 60).toString().padStart(2, '0');
            
            if (hours > 0) {
                setElapsedTime(`${hours}:${minutes}:${seconds}`);
            } else {
                setElapsedTime(`${minutes}:${seconds}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt, attemptStatus]);


    const handleSend = async () => {
        const userMessage: userMsg = { sender: "korisnik", text: input };
        addMessage(userMessage);

        const response = await fetch(`${backendURL}/attempts/${attemptId}/getDU`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input, case_id: caseId })
        });
        
        const data = await response.json();
        const aiMsg: userMsg = { sender: "sustav", text: data.result, du: data.du_id };
        addMessage(aiMsg);
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
            setFeedback(data);

            if (data.status) {
                setAttemptStatus(data.status);
            }

        } catch(err) {
            console.error(err);
        }
    }

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
            const currentLength = unlockedHints.length;
            const response = await fetch(`${backendURL}/attempts/${attemptId}/hint?sequence_no=${currentLength}`);

            if (!response.ok) {
                if (response.status === 404) {
                    alert("Nema više dostupnih hintova za ovaj slučaj."); 
                } else {
                    throw new Error("Neuspjelo dohvaćanje hinta");
                }
                return;
            }

            const newHint: Hint = await response.json();

            addHint(newHint);

        } catch(err) {
            console.error(err);
        }
    }

    const handleUndo = async () => {
        const lastDuMessage = [...messages].reverse().find(m => m.du);

        if (!lastDuMessage || !lastDuMessage.du) {
            alert("Nema prethodnih dijagnostičkih radnji koje se mogu poništiti.");
            return;
        }

        try {
            const response = await fetch(`${backendURL}/attempts/${attemptId}/undo`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                undoLastAction(lastDuMessage.du);
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "Greška pri poništavanju.");
            }
        } catch(err) {
            console.error(err);
        }
    };

    const handleAskMentor = async () => {
        if (!input) return;
        
        const userMsg: userMsg = { sender: "korisnik", text: `[Pitanje za mentora]: ${input}` };
        addMessage(userMsg);
        setInput("");

        const response = await fetch(`${backendURL}/attempts/${attemptId}/ask-llm-mentor`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ message: input })
        });
        
        const data = await response.json();

        const aiMsg: userMsg = { sender: "llm-mentor", text: data.result };
        addMessage(aiMsg);
    };

    const handleQuit = async () => {
        try {
            const response = await fetch(`${backendURL}/attempts/${attemptId}/cancel`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                }
            });

            if (response.ok) {
                reset(); 
                navigate("/user/dashboard");
            } else {
                const errorData = await response.json();
                console.error("Greška pri otkazivanju:", errorData.detail);
            }

        } catch(err) {
            console.error(err);
        }
    }

    if (!isStoreReady) {
        return <div className="text-white">Učitavanje slučaja...</div>;
    }

    return (
        <div className="flex flex-col w-screen h-screen overflow-hidden bg-gray-700">
            <div className="p-5 relative flex justify-center items-center h-fit w-full shrink-0">
                <ArrowNarrowLeft onClick={() => navigate("/user/dashboard")} className="absolute left-5 top-1/2 -translate-y-1/2 scale-130 text-gray-50 hover:cursor-pointer" />
                <h1 className="text-orange-400 font-bold text-2xl">{caseInfo?.title}</h1>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white font-mono bg-gray-800 px-4 py-2 rounded-lg border border-gray-600 flex gap-3">
                    <Clock /> {elapsedTime}
                </div>
            </div>
            <div className="p-5 flex gap-5 flex-1 overflow-hidden min-h-0">
                <div className="w-1/3 flex flex-col gap-5 items-center overflow-y-auto pr-2">
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
                        {unlockedHints.map((h) => (
                            <div key={h.sequence_no} className="border border-gray-500 bg-gray-600 text-gray-100 px-5 py-2 rounded">
                                <p>
                                    <span className="text-orange-300">Hint {h.sequence_no}:</span> {h.text}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div>
                        {feedback && (
                            <div className={feedback.verdict === "correct" ? "mt-5 p-3 bg-green-200 rounded" : feedback.verdict === "incorrect" ? "mt-5 p-3 bg-red-200 rounded" : "mt-5 p-3 bg-orange-200 rounded"}>
                                <strong>{feedback.verdict === "correct" ? "Točno!" : feedback.verdict === "incorrect" ? "Netočno" : "Parcijalno točno"}</strong>
                                <p>{feedback.feedback}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="w-2/3 h-full flex flex-col items-center">
                    <div className="flex-1 min-h-0 border border-gray-500 overflow-y-auto p-2.5 w-full bg-gray-800 rounded-lg shadow-inner mb-4">
                        {messages.map((m, i) => (
                            <p key={i} className={m.sender === "korisnik" ? "text-orange-400" : m.sender === "sustav" ? "text-gray-100" : "text-green-400"}>
                                <strong>{m.sender}:</strong> {m.text}
                            </p>
                        ))}
                    </div>

                    <div className="w-full shrink-0 flex flex-col items-center gap-1">
                        {attemptStatus === "in_progress" ? (
                            <>
                                <div className="w-2/3 mt-2 flex gap-2">
                                    <input 
                                        type="text" 
                                        value={input} 
                                        onChange={(e) => setInput(e.target.value)} 
                                        onKeyDown={handleKeyDown}
                                        className="border border-gray-400 rounded px-3 py-2 flex-1 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder={settings?.enable_LLM_mentor ? "Zatraži DU ili pitaj LLM mentora..." : "Zatraži DU..."}
                                    />
                                    <button onClick={handleSend} 
                                        className="bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-lg hover:cursor-pointer"
                                    >Zatraži DU</button>
                                    {settings?.enable_LLM_mentor && (
                                        <button onClick={handleAskMentor} className="bg-green-600 text-white font-bold px-3 py-2 rounded-lg hover:cursor-pointer">
                                            Pitaj mentora
                                        </button>
                                    )}
                                </div>

                                <div className="w-2/3 mt-2 flex gap-2">
                                    <input 
                                        type="text" 
                                        value={diagnosis} 
                                        onChange={(e) => setDiagnosis(e.target.value)}
                                        className="border border-gray-400 rounded px-3 py-2 w-full text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder="Pokušaj dijagnoze..."
                                    />
                                    <button onClick={handleVerifyDiagnosis} 
                                        className="bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-lg hover:cursor-pointer"
                                    >Provjeri</button>
                                </div>

                                <div className="w-2/3 mt-2 flex gap-2">
                                    {settings?.enable_hints && (
                                        <button onClick={handleGetHint} className="bg-orange-500 text-orange-50 font-bold px-3 py-2 rounded-lg hover:cursor-pointer">
                                            Hint
                                        </button>
                                    )}
                                    {settings?.enable_undo && (
                                        <button onClick={handleUndo} className="bg-gray-500 text-white font-bold px-3 py-2 rounded-lg hover:cursor-pointer flex gap-1">
                                            <ReverseLeft className="w-5" /> Poništi 
                                        </button>
                                    )}
                                    <button onClick={() => setCancelModalOpen(true)} className="bg-red-600 text-white font-bold px-3 py-2 rounded-lg hover:cursor-pointer ml-auto">
                                        Prekini rješavanje
                                    </button>
                                </div> 
                            </>
                        ) : (
                            <div className="mt-5 p-5 bg-gray-800 text-white rounded-lg border border-gray-500 text-center w-1/2">
                                <h3 className="text-xl font-bold mb-2">Rješavanje je završeno.</h3>

                                {settings?.show_result_immediately ? (
                                    <button onClick={() => navigate(`/case/${attemptId}/results`)} className="cursor-pointer font-semibold bg-gray-500 px-4 py-2 rounded-lg mt-3">
                                        Pogledaj detaljan izvještaj
                                    </button>
                                ) : (
                                    <p className="text-gray-400">Vaš rezultat je zabilježen. Povratne informacije bit će vidljive nakon završetka roka zadaće.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal 
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                title={"Prekinuti rješavanje?"}
            >
                <div className="w-full flex justify-center">
                    <button onClick={handleQuit} 
                        className="bg-red-600 text-orange-50 font-bold px-3 py-2 rounded hover:cursor-pointer"
                    >Potvrdi</button>
                </div>
            </Modal>

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
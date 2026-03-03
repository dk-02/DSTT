import { useState, type KeyboardEvent } from "react"

const backendURL = import.meta.env.VITE_APP_BACKEND;

interface userMsg {
    sender: string;
    text: string;
    ddu?: string;
}

function App() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<userMsg[]>([]);

    const handleSend = async () => {
        const userMsg = { sender: "student", text: input };
        setMessages([...messages, userMsg]);

        const response = await fetch(`${backendURL}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input })
        });
        
        const data = await response.json();
        const aiMsg = { sender: "system", text: data.result, ddu: data.ddu_id };
        setMessages(prev => [...prev, aiMsg]);
        setInput("");
    };

    // Send text to chat with enter
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            handleSend();
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto' }}>
            <div style={{ height: '300px', border: '1px solid #ccc', overflowY: 'scroll', padding: '10px' }}>
                {messages.map((m, i) => (
                    <p key={i} style={{ color: m.sender === "student" ? "blue" : "green" }}>
                        <strong>{m.sender}:</strong> {m.text} {m.ddu && `[ID: ${m.ddu}]`}
                    </p>
                ))}
            </div>
            <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown}
                className="border rounded mr-5"
                placeholder="Ask for DDU..."
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
}

export default App
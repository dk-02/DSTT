import { useState } from "react"

interface Response {
  original_text: string;
  processed_text: string;
}

const backend = import.meta.env.VITE_APP_BACKEND;

function App() {
  const [text, setText] = useState("");
  const [response, setResponse] = useState<Response | null>(null);

  const sendText = async () => {
    const res = await fetch(`${backend}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    setResponse(data);
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Test komunikacije</h1>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Unesi tekst"
      />

      <button onClick={sendText}>Pošalji</button>

      {response && (
        <div>
          <p>Original: {response.original_text}</p>
          <p>Processed: {response.processed_text}</p>
        </div>
      )}
    </div>
  )
}

export default App
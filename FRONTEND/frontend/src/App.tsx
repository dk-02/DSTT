import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import CaseSolving from "./pages/CaseSolving";
import Results from "./pages/Results";
import CaseCreating from "./pages/CaseCreating";

function App() {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/case/:id" element={<CaseSolving />} />
                <Route path="/case/:id/results" element={<Results />} />
                <Route path="/case/create" element={<CaseCreating />} />
            </Routes>
        </Router>
    )
    
}

export default App;
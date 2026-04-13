import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import CaseSolving from "./pages/CaseSolving";
import Results from "./pages/Results";
import CaseCreating from "./pages/CaseCreating";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import { ProtectedAdminRoute } from "./components/auth/ProtectedAdminRoute";

function App() {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/case/solve/:id" element={<CaseSolving />} />
                <Route path="/case/:id/results" element={<Results />} />
                <Route path="/case/create" element={<CaseCreating />} />
                <Route path="/user/register" element={<Register />} />
                <Route path="/user/login" element={<Login />} />
                <Route path="/user/profile" element={<Profile />} />
                <Route 
                    path="/admin/dashboard" 
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard />
                        </ProtectedAdminRoute>
                    } />
            </Routes>
        </Router>
    )
    
}

export default App;
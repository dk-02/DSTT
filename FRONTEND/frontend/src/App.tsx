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
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

function App() {
    const { token, logout } = useAuthStore();

    useEffect(() => {
        if (token) {
            try {
                const decoded: MyTokenPayload = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decoded.exp < currentTime) {
                    logout();
                    window.location.href = "/user/login";
                }
            } catch (error) {
                console.error(error);
                logout();
            }
        }
    }, [token, logout]);

    
    return(
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/case/solve/:id" element={<CaseSolving />} />
                <Route path="/case/:id/results" element={<Results />} />
                <Route path="/case/create" element={<CaseCreating />} />
                <Route path="/case/edit/:caseId" element={<CaseCreating />} />
                <Route path="/user/register" element={<Register />} />
                <Route path="/user/login" element={<Login />} />
                <Route path="/user/profile" element={<Profile />} />
                <Route path="/user/dashboard" element={<Dashboard />} />
                {/* <Route path="/user/dashboard" element={<Dashboard />}>
                    <Route index element={<TeacherActiveCases />} />
                    <Route path="archive" element={<CaseArchive />} />
                </Route> */}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
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
import { ArrowNarrowLeft } from "@untitledui/icons";
import { useNavigate } from "react-router-dom";

// const backendURL = import.meta.env.VITE_APP_BACKEND;

export const AdminDashboard = () => {
    
    const navigate = useNavigate(); 


    return (
        <div className="flex justify-center items-center w-full h-screen bg-gray-700 relative">
            <ArrowNarrowLeft onClick={() => navigate("/")} className="absolute top-5 left-5 scale-130 text-gray-50 hover:cursor-pointer" />
            <h1>Admin dashboard</h1>
        </div>
    );
};
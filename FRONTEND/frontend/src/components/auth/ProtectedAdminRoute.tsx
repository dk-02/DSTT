import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";


export const ProtectedAdminRoute = ({ children }: { children: JSX.Element }) => {
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();
    const { isAdmin } = useRole();

    useEffect(() => {
        if (!token) {
            navigate("/user/login", { replace: true });
        } else if (!isAdmin) {
            navigate("/", { replace: true });
        }
    }, [token, isAdmin, navigate]);


    if (!token || !isAdmin) {
        return null;
    }

    return children;
};
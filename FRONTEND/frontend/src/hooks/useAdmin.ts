import { jwtDecode } from "jwt-decode";
import { useAuthStore } from "../store/useAuthStore";

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

export const useAdmin = () => {
    const token = useAuthStore((state) => state.token);

    if (!token) return false;

    try {
        const decoded = jwtDecode<MyTokenPayload>(token);
        return decoded.roles?.includes("admin") || false;
    } catch (error) {
        console.error("Greška pri dekodiranju tokena:", error);
        return false;
    }
};
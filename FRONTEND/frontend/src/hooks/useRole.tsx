import { jwtDecode } from "jwt-decode";
import { useAuthStore } from "../store/useAuthStore";

interface MyTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    exp: number;
}

export const useRole = () => {
    const token = useAuthStore((state) => state.token);

    const rolesInfo = {
        isAdmin: false,
        isTeacher: false,
        isExpert: false,
        isExaminee: false,
        roles: [] as string[],
        isAuthenticated: !!token
    };

    if (!token) return rolesInfo;

    try {
        const decoded = jwtDecode<MyTokenPayload>(token);
        const userRoles = decoded.roles || [];

        return {
            isAdmin: userRoles.includes("admin"),
            isTeacher: userRoles.includes("teacher"),
            isExpert: userRoles.includes("expert"),
            isExaminee: userRoles.includes("examinee"),
            roles: userRoles,
            isAuthenticated: true
        };
    } catch (error) {
        console.error("Greška pri dekodiranju tokena:", error);
        return rolesInfo;
    }
};
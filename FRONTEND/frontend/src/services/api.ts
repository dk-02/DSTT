import { useAuthStore } from "../store/useAuthStore";
import { useCaseStore } from "../store/useCaseStore";

const backendURL = import.meta.env.VITE_APP_BACKEND;

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = useAuthStore.getState().token;

    const isFormData = options.body instanceof FormData;
    const hasBody = !!options.body; // For POST, PUT, PATCH

    const headers: Record<string, string> = {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string>),
    };

    if (hasBody && !isFormData) {
        headers["Content-Type"] = "application/json";
    }

    try {
        const response = await fetch(`${backendURL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            console.error("Sesija istekla. Automatska odjava...");

            useAuthStore.getState().logout();
            useCaseStore.getState().clearCaseData();

            window.location.href = "/user/login";
            return;
        }

        return response;

    } catch (error) {
        console.error("Mrežna greška:", error);
        return;
    }
};
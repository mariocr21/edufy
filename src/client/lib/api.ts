import type { ApiResponse } from "../../shared/types";
import { useAuthStore } from "../stores/authStore";

const API_BASE = "/api";

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = useAuthStore.getState().token;

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        useAuthStore.getState().logout();
    }

    return res.json();
}

export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint),

    post: <T>(endpoint: string, data: unknown) =>
        request<T>(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    put: <T>(endpoint: string, data: unknown) =>
        request<T>(endpoint, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: <T>(endpoint: string) =>
        request<T>(endpoint, { method: "DELETE" }),
};

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "../../shared/types";

interface AuthState {
    token: string | null;
    user: Omit<User, "created_at"> | null;
    isAuthenticated: boolean;

    login: (token: string, user: Omit<User, "created_at">) => void;
    logout: () => void;
    hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            login: (token, user) =>
                set({
                    token,
                    user,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                }),

            hasRole: (...roles) => {
                const { user } = get();
                return !!user && roles.includes(user.role);
            },
        }),
        {
            name: "cetmar42-auth",
        }
    )
);

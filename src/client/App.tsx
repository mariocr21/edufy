import { Routes, Route, Navigate } from "react-router";
import { useAuthStore } from "./stores/authStore";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { StudentsPage } from "./pages/StudentsPage";
import { UsersPage } from "./pages/UsersPage";
import { TeachersPage } from "./pages/TeachersPage";
import { AttendancePage } from "./pages/AttendancePage";
import { GradesPage } from "./pages/GradesPage";
import { PrefectPage } from "./pages/PrefectPage";
import { CredentialsPage } from "./pages/CredentialsPage";
import { ConstanciasPage } from "./pages/ConstanciasPage";
import { AppLayout } from "./components/layout/AppLayout";
import type { UserRole } from "../shared/types";

function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

export function App() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    return (
        <Routes>
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Routes>
                                <Route path="/" element={<DashboardPage />} />
                                <Route
                                    path="/usuarios"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin"]}>
                                            <UsersPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="/alumnos" element={<StudentsPage />} />
                                <Route
                                    path="/docentes"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin"]}>
                                            <TeachersPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/calificaciones"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                                            <GradesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/asistencia"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin", "teacher", "prefect"]}>
                                            <AttendancePage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/prefectura"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin", "prefect"]}>
                                            <PrefectPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/credenciales"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin", "prefect"]}>
                                            <CredentialsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/tramites"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin"]}>
                                            <ConstanciasPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/importar"
                                    element={
                                        <ProtectedRoute allowedRoles={["admin"]}>
                                            <ImportPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </AppLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

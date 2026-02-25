import { Routes, Route, Navigate } from "react-router";
import { useAuthStore } from "./stores/authStore";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { StudentsPage } from "./pages/StudentsPage";
import { TeachersPage } from "./pages/TeachersPage";
import { AppLayout } from "./components/layout/AppLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
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
                                <Route path="/alumnos" element={<StudentsPage />} />
                                <Route path="/docentes" element={<TeachersPage />} />
                                <Route path="/calificaciones" element={<PlaceholderPage title="Calificaciones" />} />
                                <Route path="/asistencia" element={<PlaceholderPage title="Asistencia" />} />
                                <Route path="/prefectura" element={<PlaceholderPage title="Prefectura" />} />
                                <Route path="/credenciales" element={<PlaceholderPage title="Credenciales" />} />
                                <Route path="/importar" element={<ImportPage />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </AppLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
                <p className="text-gray-500">Módulo en desarrollo</p>
            </div>
        </div>
    );
}

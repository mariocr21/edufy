import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuthStore } from "../../stores/authStore";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    ClipboardList,
    CalendarCheck,
    ShieldAlert,
    CreditCard,
    Upload,
    LogOut,
    Menu,
    X,
    Waves,
    ChevronLeft,
} from "lucide-react";

const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/alumnos", icon: Users, label: "Alumnos" },
    { to: "/docentes", icon: GraduationCap, label: "Docentes" },
    { to: "/calificaciones", icon: ClipboardList, label: "Calificaciones" },
    { to: "/asistencia", icon: CalendarCheck, label: "Asistencia" },
    { to: "/prefectura", icon: ShieldAlert, label: "Prefectura" },
    { to: "/credenciales", icon: CreditCard, label: "Credenciales" },
    { to: "/importar", icon: Upload, label: "Importar Datos" },
];

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const roleLabels: Record<string, string> = {
        admin: "Administrador",
        teacher: "Docente",
        prefect: "Prefecto",
        student: "Alumno",
        parent: "Padre/Tutor",
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-[72px]" : "w-64"}
        `}
            >
                {/* Logo */}
                <div className={`flex items-center gap-3 p-4 border-b border-gray-100 ${collapsed ? "justify-center" : ""}`}>
                    <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-ocean-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Waves className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-sm font-bold text-gray-900 truncate">CETMAR 42</h1>
                            <p className="text-[10px] text-gray-400 truncate">Sistema Escolar</p>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden ml-auto text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-3 overflow-y-auto">
                    <ul className="space-y-0.5 px-2">
                        {navItems.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    end={item.to === "/"}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                    ${isActive
                                            ? "bg-brand-50 text-brand-700"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                        }
                    ${collapsed ? "justify-center" : ""}
                    `
                                    }
                                    title={collapsed ? item.label : undefined}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Collapse toggle (desktop) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex items-center justify-center p-2 mx-2 mb-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
                </button>

                {/* User */}
                <div className={`border-t border-gray-100 p-3 ${collapsed ? "px-2" : ""}`}>
                    <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-700">
                                {user?.display_name?.charAt(0).toUpperCase() || "A"}
                            </span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.display_name}</p>
                                <p className="text-[10px] text-gray-400">{roleLabels[user?.role ?? ""] ?? user?.role}</p>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 h-14 flex items-center px-4 lg:px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-gray-600 hover:text-gray-900 mr-3"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <span className="text-xs text-gray-400 hidden sm:block">
                        SEMS · DGECYTM · CETMAR No. 42
                    </span>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

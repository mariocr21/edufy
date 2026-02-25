import { useState } from "react";
import { useNavigate } from "react-router";
import { Waves, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import type { LoginResponse } from "../../shared/types";

export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await api.post<LoginResponse>("/auth/login", { email, password });
            if (res.success && res.data) {
                login(res.data.token, res.data.user);
                navigate("/", { replace: true });
            } else {
                setError(res.error || "Error al iniciar sesión");
            }
        } catch {
            setError("Error de conexión al servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-800 to-ocean-900 text-white flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorative waves */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" fill="currentColor">
                        <path d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,229.3C672,235,768,213,864,186.7C960,160,1056,128,1152,133.3C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Waves className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">CETMAR 42</h1>
                            <p className="text-sm text-blue-200">Centro de Estudios Tecnológicos del Mar</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <h2 className="text-4xl font-bold leading-tight">
                        Sistema Escolar
                        <span className="block text-ocean-300">Integral</span>
                    </h2>
                    <p className="text-lg text-blue-200/80 max-w-md">
                        Control escolar, calificaciones, asistencias, conducta y credenciales en una sola plataforma.
                    </p>
                    <div className="flex gap-6 text-sm text-blue-200/70">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-ocean-400 rounded-full" />
                            Acuacultura
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                            PIA
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-400 rounded-full" />
                            RSIA
                        </div>
                    </div>
                </div>

                <p className="relative z-10 text-xs text-blue-300/50">
                    © {new Date().getFullYear()} SEMS · DGECYTM · CETMAR No. 42
                </p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                                <Waves className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">CETMAR 42</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h3>
                        <p className="mt-1 text-gray-500">Ingresa tus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-in">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="usuario@cetmar42.edu.mx"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pr-10"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

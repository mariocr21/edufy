import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, KeyRound, Power, X } from "lucide-react";
import { api } from "../lib/api";

type UserRole = "admin" | "teacher" | "prefect" | "student" | "parent";

interface UserRow {
    id: number;
    email: string;
    role: UserRole;
    display_name: string;
    active: number;
    created_at: string;
    teacher_id?: number | null;
    teacher_name?: string | null;
    student_id?: number | null;
    no_control?: string | null;
}

interface CreateUserForm {
    email: string;
    password: string;
    role: UserRole;
    display_name: string;
}

const emptyForm: CreateUserForm = {
    email: "",
    password: "",
    role: "teacher",
    display_name: "",
};

const roleLabels: Record<UserRole, string> = {
    admin: "Administrador",
    teacher: "Docente",
    prefect: "Prefectura",
    student: "Alumno",
    parent: "Padre/Tutor",
};

export function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [form, setForm] = useState<CreateUserForm>(emptyForm);
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (roleFilter) params.append("role", roleFilter);

        const res = await api.get<UserRow[]>(`/users${params.toString() ? `?${params.toString()}` : ""}`);
        if (res.success && res.data) {
            setUsers(res.data);
        } else {
            setError(res.error || "No fue posible cargar los usuarios");
        }
        setLoading(false);
    }, [roleFilter, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const clearMessages = () => {
        setError("");
        setSuccess("");
    };

    const handleCreateUser = async () => {
        clearMessages();
        setSaving(true);
        const res = await api.post("/users", form);
        setSaving(false);

        if (res.success) {
            setSuccess("Usuario creado correctamente");
            setForm(emptyForm);
            setShowCreateModal(false);
            fetchUsers();
        } else {
            setError(res.error || "No fue posible crear el usuario");
        }
    };

    const toggleStatus = async (user: UserRow) => {
        clearMessages();
        const res = await api.put(`/users/${user.id}/status`, { active: !user.active });
        if (res.success) {
            setSuccess(`Usuario ${user.active ? "desactivado" : "activado"} correctamente`);
            fetchUsers();
        } else {
            setError(res.error || "No fue posible actualizar el estado");
        }
    };

    const openPasswordModal = (user: UserRow) => {
        clearMessages();
        setSelectedUser(user);
        setNewPassword("");
        setShowPasswordModal(true);
    };

    const handleResetPassword = async () => {
        if (!selectedUser) return;
        clearMessages();
        setSaving(true);
        const res = await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
        setSaving(false);

        if (res.success) {
            setSuccess("Contraseña actualizada correctamente");
            setShowPasswordModal(false);
            setSelectedUser(null);
            setNewPassword("");
        } else {
            setError(res.error || "No fue posible actualizar la contraseña");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-brand-500" /> Usuarios
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Crea y administra cuentas del sistema</p>
                </div>
                <button
                    onClick={() => {
                        clearMessages();
                        setForm(emptyForm);
                        setShowCreateModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

            <div className="card !p-3 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        className="input-field pl-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="input-field text-sm md:w-56" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">Todos los roles</option>
                    {Object.entries(roleLabels).map(([role, label]) => (
                        <option key={role} value={role}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Cargando usuarios...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No hay usuarios con esos filtros.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Usuario</th>
                                    <th className="px-6 py-3">Rol</th>
                                    <th className="px-6 py-3">Vinculación</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{user.display_name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">{roleLabels[user.role]}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.teacher_name ? `Docente: ${user.teacher_name}` : user.no_control ? `Alumno: ${user.no_control}` : "Sin vínculo"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                {user.active ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openPasswordModal(user)} className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100">
                                                    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                                    Resetear
                                                </button>
                                                <button onClick={() => toggleStatus(user)} className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg ${user.active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                                                    <Power className="w-3.5 h-3.5 mr-1.5" />
                                                    {user.active ? "Desactivar" : "Activar"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Nuevo Usuario</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <input className="input-field text-sm" placeholder="Nombre para mostrar" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                            <input className="input-field text-sm" type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            <select className="input-field text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                                {Object.entries(roleLabels).map(([role, label]) => (
                                    <option key={role} value={role}>{label}</option>
                                ))}
                            </select>
                            <input className="input-field text-sm" type="password" placeholder="Contraseña inicial" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
                            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancelar</button>
                            <button onClick={handleCreateUser} disabled={saving} className="btn-primary">{saving ? "Guardando..." : "Crear Usuario"}</button>
                        </div>
                    </div>
                </div>
            )}

            {showPasswordModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Resetear Contraseña</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-600">Usuario: <strong>{selectedUser.display_name}</strong></p>
                            <input className="input-field text-sm" type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
                            <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancelar</button>
                            <button onClick={handleResetPassword} disabled={saving} className="btn-primary">{saving ? "Actualizando..." : "Guardar Contraseña"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

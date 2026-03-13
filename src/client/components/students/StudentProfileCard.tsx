import { IdCard, Phone, ShieldPlus, UserCircle2 } from "lucide-react";
import type { StudentProfileData } from "./types";

function fullName(profile: StudentProfileData) {
    const { paterno, materno, name } = profile.student;
    return [paterno, materno, name].filter(Boolean).join(" ");
}

export function StudentProfileCard({
    profile,
    loading,
    error,
}: {
    profile: StudentProfileData | null;
    loading?: boolean;
    error?: string | null;
}) {
    if (loading) {
        return (
            <div className="card space-y-3">
                <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card border border-red-200 bg-red-50 text-sm text-red-700">
                {error}
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="card text-sm text-gray-500">
                Selecciona un alumno para ver su ficha integral.
            </div>
        );
    }

    const primaryGuardian = profile.guardians[0];

    return (
        <div className="card overflow-hidden !p-0">
            <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-sky-500 p-5 text-white">
                <div className="flex items-center gap-4">
                    {profile.student.photo_url ? (
                        <img
                            src={profile.student.photo_url}
                            alt={fullName(profile)}
                            className="h-20 w-20 rounded-2xl border border-white/30 object-cover shadow-lg"
                        />
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/10 shadow-lg">
                            <UserCircle2 className="h-10 w-10" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold">{fullName(profile)}</h2>
                        <p className="mt-1 text-sm text-white/85">{profile.student.no_control}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-white/15 px-2.5 py-1">{profile.student.grupo || "Sin grupo"}</span>
                            <span className="rounded-full bg-white/15 px-2.5 py-1">Semestre {profile.student.semester || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <IdCard className="h-4 w-4" />
                            Carrera
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-900">{profile.student.career || "Sin capturar"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <ShieldPlus className="h-4 w-4" />
                            Tutor principal
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-900">{primaryGuardian?.name || "Sin tutor registrado"}</p>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <Phone className="h-4 w-4" />
                        Contacto rapido
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                        <p>{primaryGuardian?.phone || "Sin telefono principal"}</p>
                        <p>{primaryGuardian?.email || "Sin correo del tutor"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

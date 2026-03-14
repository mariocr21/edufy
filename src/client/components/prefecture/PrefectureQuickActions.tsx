import {
    AlertTriangle,
    Clock3,
    FileText,
    MessageCircleMore,
    ShieldAlert,
    TimerReset,
    Undo2,
} from "lucide-react";

export type PrefectureActionType =
    | "conducta"
    | "falta_justificada"
    | "retardo"
    | "salida"
    | "citatorio"
    | "observacion"
    | "contacto_tutor";

const actionConfig: Array<{
    type: PrefectureActionType;
    title: string;
    description: string;
    icon: typeof ShieldAlert;
    accent: string;
  }> = [
    {
        type: "conducta",
        title: "Registrar conducta",
        description: "Levanta una incidencia disciplinaria y refleja el evento en bitacora.",
        icon: ShieldAlert,
        accent: "from-red-500 to-orange-500",
    },
    {
        type: "falta_justificada",
        title: "Justificar falta",
        description: "Corrige asistencia y deja evidencia del motivo y responsable.",
        icon: Undo2,
        accent: "from-emerald-500 to-teal-500",
    },
    {
        type: "retardo",
        title: "Registrar retardo",
        description: "Anota llegadas tardias con contexto breve para seguimiento.",
        icon: Clock3,
        accent: "from-amber-500 to-yellow-500",
    },
    {
        type: "salida",
        title: "Registrar salida",
        description: "Documenta salidas anticipadas o movimientos fuera del aula.",
        icon: TimerReset,
        accent: "from-sky-500 to-cyan-500",
    },
    {
        type: "citatorio",
        title: "Crear citatorio",
        description: "Genera un evento formal para convocar al tutor o alumno.",
        icon: AlertTriangle,
        accent: "from-fuchsia-500 to-rose-500",
    },
    {
        type: "observacion",
        title: "Agregar observacion",
        description: "Captura contexto operativo sin alterar asistencia ni conducta.",
        icon: FileText,
        accent: "from-slate-500 to-slate-700",
    },
    {
        type: "contacto_tutor",
        title: "Notificar tutor",
        description: "Prepara mensaje sugerido y abre WhatsApp con texto prellenado.",
        icon: MessageCircleMore,
        accent: "from-brand-500 to-sky-500",
    },
];

export function PrefectureQuickActions({
    disabled,
    onSelect,
}: {
    disabled?: boolean;
    onSelect: (action: PrefectureActionType) => void;
}) {
    return (
        <section className="card overflow-hidden !p-0">
            <div className="border-b border-gray-100 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-700 px-5 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                    Acciones rapidas
                </p>
                <h2 className="mt-2 text-lg font-semibold">Captura operativa de Prefectura</h2>
                <p className="mt-1 text-sm text-white/75">
                    Selecciona un alumno y dispara el flujo correcto sin salir de la consola.
                </p>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
                {actionConfig.map((action) => {
                    const Icon = action.icon;

                    return (
                        <button
                            key={action.type}
                            type="button"
                            onClick={() => onSelect(action.type)}
                            disabled={disabled}
                            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${action.accent}`} />
                            <div className="flex items-start gap-3">
                                <div className={`rounded-2xl bg-gradient-to-br ${action.accent} p-3 text-white shadow-md`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-gray-900">{action.title}</h3>
                                    <p className="mt-1 text-xs leading-5 text-gray-500">{action.description}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

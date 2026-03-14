import { format, parseISO } from "date-fns";
import {
    CheckCircle2,
    Clock3,
    FileText,
    MessageCircleMore,
    Phone,
    ShieldAlert,
    TimerReset,
    Undo2,
} from "lucide-react";
import {
    getPrefectureEventLabel,
    type PrefectureTimelineEvent,
} from "../../../shared/prefecture";

const timelineIcons = {
    conducta: ShieldAlert,
    falta_justificada: Undo2,
    retardo: Clock3,
    salida: TimerReset,
    citatorio: MessageCircleMore,
    contacto_tutor: Phone,
    observacion: FileText,
} as const;

export function PrefectureTimeline({
    events,
    loading,
    emptyMessage = "Aun no hay eventos registrados para este alumno.",
}: {
    events: PrefectureTimelineEvent[];
    loading?: boolean;
    emptyMessage?: string;
}) {
    return (
        <section className="card">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bitacora del alumno</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">Seguimiento integral</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {events.length} eventos
                </span>
            </div>

            <div className="mt-5 space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        {emptyMessage}
                    </p>
                ) : (
                    events.map((event) => {
                        const Icon = timelineIcons[event.event_type];

                        return (
                            <article key={event.id} className="relative rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-white p-3 text-brand-600 shadow-sm">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                                                {getPrefectureEventLabel(event.event_type)}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {format(parseISO(event.event_date), "dd/MM/yyyy")}
                                            </span>
                                        </div>
                                        <h4 className="mt-2 text-sm font-semibold text-slate-900">{event.summary}</h4>
                                        {event.details && (
                                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{event.details}</p>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                            <span>Responsable: {event.created_by_name || "Sistema"}</span>
                                            {event.guardian_name && <span>Tutor: {event.guardian_name}</span>}
                                            {event.related_attendance_id && <span>Asistencia #{event.related_attendance_id}</span>}
                                            {event.related_conduct_id && <span>Conducta #{event.related_conduct_id}</span>}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {event.whatsapp_opened_at ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                    WhatsApp preparado
                                                </span>
                                            ) : event.whatsapp_message ? (
                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                    <MessageCircleMore className="mr-1 h-3.5 w-3.5" />
                                                    Mensaje sugerido listo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                    Sin seguimiento de WhatsApp
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </section>
    );
}

import { z } from "zod";

export const prefectureEventTypes = [
    "conducta",
    "falta_justificada",
    "retardo",
    "salida",
    "citatorio",
    "contacto_tutor",
    "observacion",
] as const;

export const prefectureEventTypeSchema = z.enum(prefectureEventTypes);

export const prefectureEventInputSchema = z.object({
    student_id: z.number().int().positive(),
    event_type: prefectureEventTypeSchema,
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato yyyy-mm-dd"),
    summary: z.string().trim().min(1, "El resumen es obligatorio"),
    details: z.string().trim().optional().nullable(),
    related_attendance_id: z.number().int().positive().optional().nullable(),
    related_conduct_id: z.number().int().positive().optional().nullable(),
    guardian_id: z.number().int().positive().optional().nullable(),
});

export type PrefectureEventType = z.infer<typeof prefectureEventTypeSchema>;
export type PrefectureEventInput = z.infer<typeof prefectureEventInputSchema>;
export interface PrefectureTimelineEvent {
    id: number;
    student_id: number;
    event_type: PrefectureEventType;
    event_date: string;
    summary: string;
    details: string | null;
    created_by: number;
    created_by_name?: string | null;
    related_attendance_id?: number | null;
    related_conduct_id?: number | null;
    guardian_id?: number | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    whatsapp_message?: string | null;
    whatsapp_opened_at?: string | null;
    created_at: string | null;
}

const prefectureEventLabels: Record<PrefectureEventType, string> = {
    conducta: "Conducta",
    falta_justificada: "Falta justificada",
    retardo: "Retardo",
    salida: "Salida",
    citatorio: "Citatorio",
    contacto_tutor: "Contacto con tutor",
    observacion: "Observacion",
};

type TimelineSortable = {
    event_date: string;
    created_at: string | null;
};

export function sortPrefectureTimeline<T extends TimelineSortable>(events: T[]): T[] {
    return [...events].sort((left, right) => {
        const dateCompare = right.event_date.localeCompare(left.event_date);
        if (dateCompare !== 0) {
            return dateCompare;
        }

        return (right.created_at ?? "").localeCompare(left.created_at ?? "");
    });
}

export function getPrefectureEventLabel(eventType: PrefectureEventType): string {
    return prefectureEventLabels[eventType];
}

export function buildPrefectureWhatsappMessage(input: {
    eventType: PrefectureEventType;
    studentName: string;
    groupName?: string | null;
    eventDate: string;
    summary: string;
}) {
    const groupLine = input.groupName ? `Grupo: ${input.groupName}` : "Grupo: Sin grupo registrado";

    return [
        "Buen dia, le compartimos informacion de Prefectura.",
        `Alumno: ${input.studentName}`,
        groupLine,
        `Fecha: ${input.eventDate}`,
        `Tipo de evento: ${getPrefectureEventLabel(input.eventType)}`,
        `Resumen: ${input.summary}`,
        "Favor de dar seguimiento por este medio o acudir al plantel si se requiere.",
    ].join("\n");
}

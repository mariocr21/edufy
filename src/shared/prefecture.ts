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

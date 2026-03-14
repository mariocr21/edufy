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

export const conductCategoryCatalog = [
    { id: "disciplina", label: "Disciplina" },
    { id: "respeto", label: "Respeto" },
    { id: "uniforme", label: "Uniforme" },
    { id: "puntualidad", label: "Puntualidad" },
    { id: "uso_celular", label: "Uso de celular" },
    { id: "materiales", label: "Tareas y materiales" },
    { id: "seguridad", label: "Seguridad" },
    { id: "otro", label: "Otro" },
] as const;

export const conductSeverityCatalog = [
    { id: "leve", label: "Leve" },
    { id: "media", label: "Media" },
    { id: "grave", label: "Grave" },
] as const;

export const conductBehaviorCatalog = [
    { id: "interrumpe_clase", label: "Interrumpio la clase" },
    { id: "uso_celular_clase", label: "Uso de celular en clase" },
    { id: "sin_uniforme", label: "No portaba uniforme" },
    { id: "lenguaje_inapropiado", label: "Lenguaje inapropiado" },
    { id: "llego_tarde", label: "Llego tarde" },
    { id: "no_ingreso_aula", label: "No ingreso al aula" },
    { id: "agresion_verbal", label: "Agresion verbal" },
    { id: "conducta_positiva", label: "Conducta positiva destacada" },
] as const;

export const justificationReasonCatalog = [
    { id: "cita_medica", label: "Cita medica" },
    { id: "enfermedad", label: "Enfermedad" },
    { id: "tramite_familiar", label: "Tramite familiar" },
    { id: "situacion_personal", label: "Situacion personal" },
    { id: "representacion_escolar", label: "Representacion escolar" },
    { id: "error_captura", label: "Error de captura" },
    { id: "otro", label: "Otro" },
] as const;

export const justificationEvidenceCatalog = [
    { id: "constancia", label: "Constancia" },
    { id: "recado_tutor", label: "Recado del tutor" },
    { id: "llamada_confirmada", label: "Llamada confirmada" },
    { id: "sin_evidencia", label: "Sin evidencia" },
] as const;

type CatalogItem<T extends string> = { id: T; label: string };

function getLabelFromCatalog<T extends readonly CatalogItem<string>[]>(
    catalog: T,
    id: string,
): string {
    return catalog.find((item) => item.id === id)?.label ?? id;
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

export function getJustificationReasonLabel(reasonId: string): string {
    return getLabelFromCatalog(justificationReasonCatalog, reasonId);
}

export function getJustificationEvidenceLabel(evidenceId: string): string {
    return getLabelFromCatalog(justificationEvidenceCatalog, evidenceId);
}

export function getConductCategoryLabel(categoryId: string): string {
    return getLabelFromCatalog(conductCategoryCatalog, categoryId);
}

export function getConductSeverityLabel(severityId: string): string {
    return getLabelFromCatalog(conductSeverityCatalog, severityId);
}

export function getConductBehaviorLabel(behaviorId: string): string {
    return getLabelFromCatalog(conductBehaviorCatalog, behaviorId);
}

export function buildPrefectureWhatsappMessage(input: {
    eventType: PrefectureEventType;
    studentName: string;
    guardianName?: string | null;
    groupName?: string | null;
    eventDate: string;
    summary: string;
    details?: string | null;
}) {
    const groupLine = input.groupName ? `Grupo: ${input.groupName}` : "Grupo: Sin grupo registrado";

    return [
        input.guardianName ? `Buen dia, ${input.guardianName}.` : "Buen dia.",
        "Le compartimos informacion de Prefectura.",
        `Alumno: ${input.studentName}`,
        groupLine,
        `Fecha: ${input.eventDate}`,
        `Tipo de evento: ${getPrefectureEventLabel(input.eventType)}`,
        `Resumen: ${input.summary}`,
        ...(input.details ? [`Detalle: ${input.details}`] : []),
        "Favor de dar seguimiento por este medio o acudir al plantel si se requiere.",
    ].join("\n");
}

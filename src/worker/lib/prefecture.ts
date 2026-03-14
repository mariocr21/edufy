import type { PrefectureEventInput } from "../../shared/prefecture";

export type PrefectureEventRecordInput = PrefectureEventInput & {
    created_by: number;
    whatsapp_message?: string | null;
    whatsapp_opened_at?: string | null;
};

export async function hasPrefectureEventsTable(db: D1Database): Promise<boolean> {
    const result = await db.prepare("PRAGMA table_info(prefecture_events)").all<{ name: string }>();
    return (result.results ?? []).length > 0;
}

export async function insertPrefectureEvent(
    db: D1Database,
    input: PrefectureEventRecordInput,
): Promise<number | null> {
    if (!(await hasPrefectureEventsTable(db))) {
        return null;
    }

    const result = await db.prepare(`
        INSERT INTO prefecture_events (
            student_id,
            event_type,
            event_date,
            summary,
            details,
            created_by,
            related_attendance_id,
            related_conduct_id,
            guardian_id,
            whatsapp_message,
            whatsapp_opened_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
        .bind(
            input.student_id,
            input.event_type,
            input.event_date,
            input.summary,
            input.details ?? null,
            input.created_by,
            input.related_attendance_id ?? null,
            input.related_conduct_id ?? null,
            input.guardian_id ?? null,
            input.whatsapp_message ?? null,
            input.whatsapp_opened_at ?? null,
        )
        .run();

    return Number(result.meta.last_row_id);
}

export async function getPrimaryGuardianForStudent(db: D1Database, studentId: number) {
    return db.prepare(`
        SELECT id, name, relationship, phone, phone_alt, email
        FROM guardians
        WHERE student_id = ?
        ORDER BY id ASC
        LIMIT 1
    `)
        .bind(studentId)
        .first<{
            id: number;
            name: string;
            relationship: string;
            phone: string;
            phone_alt: string | null;
            email: string | null;
        }>();
}

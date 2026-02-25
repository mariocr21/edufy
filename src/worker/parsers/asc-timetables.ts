/**
 * Parser for aSc Timetables XML format.
 * Extracts teachers, subjects, classes/groups, and schedule cards.
 */

export interface ParsedTeacher {
    xml_id: string;
    name: string;
    short_name: string;
}

export interface ParsedSubject {
    xml_id: string;
    name: string;
    short_code: string;
}

export interface ParsedClass {
    xml_id: string;
    name: string;
    short_name: string;
}

export interface ParsedScheduleCard {
    lesson_id: string;
    class_ids: string[];
    subject_id: string;
    teacher_ids: string[];
    classroom_ids: string[];
    day: number;      // 0-indexed from XML → stored as 1-indexed (1=Mon)
    period: number;   // 0-indexed from XML → stored as 1-indexed
}

export interface ParsedPeriodDef {
    name: string;
    short: string;
    start_time: string;
    end_time: string;
}

export interface AscParsedData {
    teachers: ParsedTeacher[];
    subjects: ParsedSubject[];
    classes: ParsedClass[];
    periods: ParsedPeriodDef[];
    cards: ParsedScheduleCard[];
    warnings: string[];
}

/**
 * Parse aSc Timetables XML string into structured data.
 * Uses basic string parsing compatible with Workers runtime (no DOMParser).
 */
export function parseAscXml(xmlText: string): AscParsedData {
    const warnings: string[] = [];
    const teachers: ParsedTeacher[] = [];
    const subjects: ParsedSubject[] = [];
    const classes: ParsedClass[] = [];
    const periods: ParsedPeriodDef[] = [];
    const cards: ParsedScheduleCard[] = [];

    // Store lessons for linking to cards
    const lessonsMap = new Map<string, {
        classIds: string[];
        subjectId: string;
        teacherIds: string[];
        classroomIds: string[];
    }>();

    // ── Parse teachers ──
    const teacherMatches = xmlText.matchAll(/<teacher\s+([^/>]*)\/?>/g);
    for (const m of teacherMatches) {
        const attrs = parseAttributes(m[1]!);
        if (attrs.id) {
            teachers.push({
                xml_id: attrs.id,
                name: attrs.name || `${attrs.firstname || ""} ${attrs.lastname || ""}`.trim(),
                short_name: attrs.short || "",
            });
        }
    }

    // ── Parse subjects ──
    const subjectMatches = xmlText.matchAll(/<subject\s+([^/>]*)\/?>/g);
    for (const m of subjectMatches) {
        const attrs = parseAttributes(m[1]!);
        if (attrs.id) {
            subjects.push({
                xml_id: attrs.id,
                name: attrs.name || "",
                short_code: attrs.short || "",
            });
        }
    }

    // ── Parse classes (groups) ──
    const classMatches = xmlText.matchAll(/<class\s+([^/>]*)\/?>/g);
    for (const m of classMatches) {
        const attrs = parseAttributes(m[1]!);
        if (attrs.id) {
            classes.push({
                xml_id: attrs.id,
                name: attrs.name || "",
                short_name: attrs.short || "",
            });
        }
    }

    // ── Parse periods ──
    const periodMatches = xmlText.matchAll(/<period\s+([^/>]*)\/?>/g);
    for (const m of periodMatches) {
        const attrs = parseAttributes(m[1]!);
        if (attrs.name || attrs.short) {
            periods.push({
                name: attrs.name || attrs.short || "",
                short: attrs.short || "",
                start_time: attrs.starttime || "",
                end_time: attrs.endtime || "",
            });
        }
    }

    // ── Parse lessons (map subject → class → teacher) ──
    const lessonMatches = xmlText.matchAll(/<lesson\s+([^/>]*)\/?>/g);
    for (const m of lessonMatches) {
        const attrs = parseAttributes(m[1]!);
        if (attrs.id) {
            lessonsMap.set(attrs.id, {
                classIds: (attrs.classids || "").split(",").filter(Boolean),
                subjectId: attrs.subjectid || "",
                teacherIds: (attrs.teacherids || "").split(",").filter(Boolean),
                classroomIds: (attrs.classroomids || "").split(",").filter(Boolean),
            });
        }
    }

    // ── Parse cards (actual schedule slots) ──
    const cardMatches = xmlText.matchAll(/<card\s+([^/>]*)\/?>/g);
    for (const m of cardMatches) {
        const attrs = parseAttributes(m[1]!);
        const lessonId = attrs.lessonid || "";
        const lesson = lessonsMap.get(lessonId);

        if (!lesson) {
            if (lessonId) warnings.push(`Card referencia lesson "${lessonId}" no encontrado`);
            continue;
        }

        const day = parseInt(attrs.days || "0", 10);
        const period = parseInt(attrs.period || "0", 10);

        // days in XML is a bitmask string like "01000" (Tuesday)
        // Or it could be a direct index. Let's handle both.
        let dayIndex = 0;
        const daysStr = attrs.days || "";
        if (daysStr.length > 1 && /^[01]+$/.test(daysStr)) {
            // Bitmask format: "10000" = Monday, "01000" = Tuesday
            dayIndex = daysStr.indexOf("1");
        } else {
            dayIndex = parseInt(daysStr, 10) || 0;
        }

        cards.push({
            lesson_id: lessonId,
            class_ids: lesson.classIds,
            subject_id: lesson.subjectId,
            teacher_ids: lesson.teacherIds,
            classroom_ids: lesson.classroomIds,
            day: dayIndex + 1,     // Convert to 1-indexed (1=Mon)
            period: period + 1,    // Convert to 1-indexed
        });
    }

    if (teachers.length === 0) warnings.push("No se encontraron docentes en el XML");
    if (subjects.length === 0) warnings.push("No se encontraron materias en el XML");
    if (classes.length === 0) warnings.push("No se encontraron grupos/clases en el XML");

    return { teachers, subjects, classes, periods, cards, warnings };
}

/**
 * Import parsed aSc data into D1.
 */
export async function importAscToD1(
    db: D1Database,
    data: AscParsedData,
    periodId: number
): Promise<{
    teachersUpserted: number;
    subjectsUpserted: number;
    groupsCreated: number;
    schedulesCreated: number;
}> {
    let teachersUpserted = 0;
    let subjectsUpserted = 0;
    let groupsCreated = 0;
    let schedulesCreated = 0;

    // Map XML IDs → DB IDs
    const teacherIdMap = new Map<string, number>();
    const subjectIdMap = new Map<string, number>();
    const classIdMap = new Map<string, number>();

    // ── Teachers ──
    for (const t of data.teachers) {
        const existing = await db
            .prepare("SELECT id FROM teachers WHERE xml_id = ?")
            .bind(t.xml_id)
            .first<{ id: number }>();

        if (existing) {
            await db
                .prepare("UPDATE teachers SET name=?, short_name=? WHERE id=?")
                .bind(t.name, t.short_name, existing.id)
                .run();
            teacherIdMap.set(t.xml_id, existing.id);
        } else {
            const result = await db
                .prepare("INSERT INTO teachers (xml_id, name, short_name) VALUES (?, ?, ?)")
                .bind(t.xml_id, t.name, t.short_name)
                .run();
            teacherIdMap.set(t.xml_id, result.meta.last_row_id as number);
        }
        teachersUpserted++;
    }

    // ── Subjects ──
    for (const s of data.subjects) {
        const existing = await db
            .prepare("SELECT id FROM subjects WHERE xml_id = ?")
            .bind(s.xml_id)
            .first<{ id: number }>();

        if (existing) {
            await db
                .prepare("UPDATE subjects SET name=?, short_code=? WHERE id=?")
                .bind(s.name, s.short_code, existing.id)
                .run();
            subjectIdMap.set(s.xml_id, existing.id);
        } else {
            const result = await db
                .prepare("INSERT INTO subjects (xml_id, name, short_code) VALUES (?, ?, ?)")
                .bind(s.xml_id, s.name, s.short_code)
                .run();
            subjectIdMap.set(s.xml_id, result.meta.last_row_id as number);
        }
        subjectsUpserted++;
    }

    // ── Classes → Groups ──
    for (const cls of data.classes) {
        // Extract semester from class name (e.g. "2 ACUA" → semester 2)
        const semesterMatch = cls.name.match(/^(\d)/);
        const semester = semesterMatch ? parseInt(semesterMatch[1]!, 10) : 0;

        // Find specialty from name
        let specialtyId: number | null = null;
        const nameUpper = cls.name.toUpperCase();
        if (nameUpper.includes("ACUA")) {
            const sp = await db.prepare("SELECT id FROM specialties WHERE code = 'ACUA'").first<{ id: number }>();
            if (sp) specialtyId = sp.id;
        } else if (nameUpper.includes("PIA")) {
            const sp = await db.prepare("SELECT id FROM specialties WHERE code = 'PIA'").first<{ id: number }>();
            if (sp) specialtyId = sp.id;
        } else if (nameUpper.includes("RSIA")) {
            const sp = await db.prepare("SELECT id FROM specialties WHERE code = 'RSIA'").first<{ id: number }>();
            if (sp) specialtyId = sp.id;
        }

        const existing = await db
            .prepare("SELECT id FROM groups_table WHERE period_id = ? AND name = ?")
            .bind(periodId, cls.name)
            .first<{ id: number }>();

        if (existing) {
            classIdMap.set(cls.xml_id, existing.id);
        } else {
            const result = await db
                .prepare("INSERT INTO groups_table (period_id, name, semester, specialty_id) VALUES (?, ?, ?, ?)")
                .bind(periodId, cls.name, semester, specialtyId)
                .run();
            classIdMap.set(cls.xml_id, result.meta.last_row_id as number);
            groupsCreated++;
        }
    }

    // ── Schedule Cards ──
    // Clear existing schedules for this period's groups to avoid duplicates on re-import
    for (const groupId of classIdMap.values()) {
        await db.prepare("DELETE FROM schedules WHERE group_id = ?").bind(groupId).run();
    }

    for (const card of data.cards) {
        const teacherId = card.teacher_ids[0] ? teacherIdMap.get(card.teacher_ids[0]) : null;
        const subjectId = subjectIdMap.get(card.subject_id);

        if (!teacherId || !subjectId) continue;

        // A card may apply to multiple classes
        for (const classXmlId of card.class_ids) {
            const groupId = classIdMap.get(classXmlId);
            if (!groupId) continue;

            const classroom = card.classroom_ids[0] || null;

            await db
                .prepare("INSERT INTO schedules (group_id, subject_id, teacher_id, day, period_num, classroom) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(groupId, subjectId, teacherId, card.day, card.period, classroom)
                .run();
            schedulesCreated++;
        }
    }

    return { teachersUpserted, subjectsUpserted, groupsCreated, schedulesCreated };
}

// ── Helpers ──

function parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /(\w+)="([^"]*)"/g;
    let match;
    while ((match = regex.exec(attrString)) !== null) {
        attrs[match[1]!.toLowerCase()] = match[2]!;
    }
    return attrs;
}

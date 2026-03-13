import type { Bindings } from "../bindings";

// ── Column mappings for SISEMS files ──

// 12-column format: student roster only
const ROSTER_HEADERS = [
    "CLV_CENTRO", "PLANTEL", "CARRERA", "GENERACION", "TURNO",
    "SEMESTRE", "GRUPO", "NO CONTROL", "NOMBRE", "PATERNO", "MATERNO", "CURP",
] as const;

// 25-column format: roster + subjects + grades + attendance
const GRADES_HEADERS = [
    "CLV_CENTRO", "PLANTEL", "CARRERA", "GENERACION", "TURNO",
    "SEMESTRE", "GRUPO", "NO CONTROL", "NOMBRE", "PATERNO", "MATERNO", "CURP",
    "NOMBRE ASIGNATURA", "NOMBRE DOCENTE", "RFC DOCENTE", 
    "PERIODO 1", "PERIODO 2", "PERIODO 3", "CALIFICACION",
    "ASISTENCIA PERIODO 1", "ASISTENCIA PERIODO 2", "ASISTENCIA PERIODO 3",
    "TIPO ACRED.", "PERIODO", "FIRMADO",
] as const;

interface ParsedStudent {
    no_control: string;
    curp: string;
    name: string;
    paterno: string;
    materno: string;
    career: string;
    generation: string;
    semester: number;
    grupo: string;
}

interface ParsedGrade {
    no_control: string;
    partial_1: number | null;
    partial_2: number | null;
    partial_3: number | null;
    final_score: number | null;
    acred_type: string | null;
    periodo_name: string | null;
    subject_name: string;
}

export interface SisemsParsedData {
    type: "roster" | "grades";
    students: ParsedStudent[];
    grades: ParsedGrade[];
    warnings: string[];
}

/**
 * Parses SISEMS XLSX data (already converted to array of arrays).
 * Detects format by column count: 12 = roster, 25 = grades.
 */
export function parseSisemsData(rows: (string | number | null)[][]): SisemsParsedData {
    const warnings: string[] = [];

    if (rows.length < 2) {
        return { type: "roster", students: [], grades: [], warnings: ["Archivo vacío o sin datos"] };
    }

    const headerRow = rows[0]!;
    const colCount = headerRow.length;
    const isGrades = colCount >= 24; // At least 24 cols for the 25-col format
    const type = isGrades ? "grades" : "roster";

    // Validate expected headers
    const expectedHeaders = isGrades ? GRADES_HEADERS : ROSTER_HEADERS;
    for (let i = 0; i < Math.min(12, expectedHeaders.length); i++) {
        const expected = expectedHeaders[i]!.toUpperCase();
        const actual = String(headerRow[i] ?? "").toUpperCase().trim();
        if (actual !== expected) {
            warnings.push(`Columna ${i + 1}: esperada "${expected}", encontrada "${actual}"`);
        }
    }

    const students: ParsedStudent[] = [];
    const grades: ParsedGrade[] = [];
    const seenControls = new Set<string>();

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r]!;
        const noControl = String(row[7] ?? "").trim();

        if (!noControl) {
            warnings.push(`Fila ${r + 1}: NO CONTROL vacío, se omitió`);
            continue;
        }

        // Parse student (deduplicate within same file)
        if (!seenControls.has(noControl)) {
            seenControls.add(noControl);
            students.push({
                no_control: noControl,
                curp: String(row[11] ?? "").trim(),
                name: String(row[8] ?? "").trim(),
                paterno: String(row[9] ?? "").trim(),
                materno: String(row[10] ?? "").trim(),
                career: String(row[2] ?? "").trim(),
                generation: normalizeGeneration(String(row[3] ?? "")),
                semester: Number(row[5]) || 0,
                grupo: String(row[6] ?? "").trim(),
            });
        }

        // Parse grades if 25-column format
        if (isGrades) {
            const subject_name = String(row[12] ?? "").trim();
            const p1 = parseScore(row[15]);
            const p2 = parseScore(row[16]);
            const p3 = parseScore(row[17]);
            const final_score = parseScore(row[18]);
            const acred_type = row[22] ? String(row[22]).trim() : null;
            const periodo_name = row[23] ? String(row[23]).trim() : null;

            if (subject_name) {
                grades.push({
                    no_control: noControl,
                    partial_1: p1,
                    partial_2: p2,
                    partial_3: p3,
                    final_score,
                    acred_type,
                    periodo_name,
                    subject_name,
                });
            }
        }
    }

    return { type, students, grades, warnings };
}

/**
 * Imports parsed SISEMS data into D1 database.
 * Upserts students by no_control, creates groups, and optionally imports grades.
 */
export async function importSisemsToD1(
    db: D1Database,
    data: SisemsParsedData,
    periodId: number
): Promise<{ studentsUpserted: number; gradesImported: number; groupsCreated: string[] }> {
    let studentsUpserted = 0;
    let gradesImported = 0;
    const groupsCreated: string[] = [];
    const statements: any[] = [];

    // Track groups to create
    const uniqueGroups = new Map<string, { semester: number; career: string }>();
    for (const s of data.students) {
        if (!uniqueGroups.has(s.grupo)) {
            uniqueGroups.set(s.grupo, { semester: s.semester, career: s.career });
        }
    }

    // Since we need IDs for relations, we have to do some sequential lookups/inserts
    // For groups:
    const groupIdMap = new Map<string, number>();
    for (const [groupName, info] of uniqueGroups) {
        let specialtyId: number | null = null;
        const careerUpper = info.career.toUpperCase();
        if (careerUpper.includes("ACUA")) {
            const sp = await db.prepare("SELECT id FROM specialties WHERE code = 'ACUA'").first<{ id: number }>();
            if (sp) specialtyId = sp.id;
        } else if (careerUpper.includes("PIA") || careerUpper.includes("PRODUCCIÓN INDUSTRIAL") || careerUpper.includes("PRODUCCION INDUSTRIAL")) {
            const sp = await db.prepare("SELECT id FROM specialties WHERE code = 'PIA'").first<{ id: number }>();
            if (sp) specialtyId = sp.id;
        } else if (careerUpper.includes("RSIA") || careerUpper.includes("RESPONSABILIDAD SOCIAL")) {
            const sp = await db.prepare("SELECT id FROM specialties WHERE code = 'RSIA'").first<{ id: number }>();
            if (sp) specialtyId = sp.id;
        }

        const existing = await db.prepare("SELECT id FROM groups_table WHERE period_id = ? AND name = ?").bind(periodId, groupName).first<{ id: number }>();
        if (existing) {
            groupIdMap.set(groupName, existing.id);
        } else {
            const result = await db.prepare("INSERT INTO groups_table (period_id, name, semester, specialty_id) VALUES (?, ?, ?, ?)").bind(periodId, groupName, info.semester, specialtyId).run();
            const newId = result.meta.last_row_id as number;
            groupIdMap.set(groupName, newId);
            groupsCreated.push(groupName);
        }
    }

    // Upsert students (doing this sequentially because we need their IDs for group_students and grades)
    // To speed this up slightly and avoid limits, we can batch lookups if possible, but D1 driver requires sequential for last_row_id.
    // Instead, let's process students in chunks
    for (const s of data.students) {
        const existing = await db.prepare("SELECT id FROM students WHERE no_control = ?").bind(s.no_control).first<{ id: number }>();
        let studentId: number;
        
        if (existing) {
            statements.push(
                db.prepare(`UPDATE students SET curp=?, name=?, paterno=?, materno=?, career=?, generation=?, semester=?, grupo=?, active=1 WHERE id=?`)
                  .bind(s.curp, s.name, s.paterno, s.materno, s.career, s.generation, s.semester, s.grupo, existing.id)
            );
            studentId = existing.id;
        } else {
            // We have to run the insert immediately to get the ID for relations
            const result = await db.prepare(`INSERT INTO students (no_control, curp, name, paterno, materno, career, generation, semester, grupo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(s.no_control, s.curp, s.name, s.paterno, s.materno, s.career, s.generation, s.semester, s.grupo).run();
            studentId = result.meta.last_row_id as number;
        }
        studentsUpserted++;

        const groupId = groupIdMap.get(s.grupo);
        if (groupId) {
            statements.push(
                db.prepare("INSERT OR IGNORE INTO group_students (group_id, student_id) VALUES (?, ?)").bind(groupId, studentId)
            );
        }

        // Execute batch if it gets too large (> 50 statements)
        if (statements.length >= 50) {
            await db.batch(statements);
            statements.length = 0; // clear
        }
    }

    // Execute remaining student statements
    if (statements.length > 0) {
        await db.batch(statements);
        statements.length = 0;
    }

    // Pre-fetch all students to a map for grades
    const allStudents = await db.prepare("SELECT id, no_control FROM students").all<{id: number, no_control: string}>();
    const studentIdMap = new Map(allStudents.results.map(s => [s.no_control, s.id]));

    // Pre-fetch all subjects
    const allSubjects = await db.prepare("SELECT id, name, short_code FROM subjects").all<{id: number, name: string, short_code: string}>();
    const subjectSysMap = new Map<string, number>();
    for (const s of allSubjects.results) {
        subjectSysMap.set(s.name.toUpperCase(), s.id);
        subjectSysMap.set(s.short_code.toUpperCase(), s.id);
    }

    // Import grades
    if (data.type === "grades") {
        // Fetch existing grades for this period once to avoid querying in loop
        const existingGradesForPeriod = await db.prepare("SELECT id, student_id, subject_id FROM grades WHERE period_id = ?").bind(periodId).all<{id: number, student_id: number, subject_id: number}>();
        const gradeMap = new Map<string, number>();
        for (const eg of existingGradesForPeriod.results) {
            gradeMap.set(`${eg.student_id}-${eg.subject_id}`, eg.id);
        }

        for (const g of data.grades) {
            const studentId = studentIdMap.get(g.no_control);
            if (!studentId) continue;

            let subjectId: number | null = null;
            if (g.subject_name) {
                const searchName = g.subject_name.toUpperCase();
                subjectId = subjectSysMap.get(searchName) || null;
                
                if (!subjectId) {
                    const newSub = await db.prepare("INSERT INTO subjects (name, short_code) VALUES (?, ?)").bind(g.subject_name, g.subject_name.substring(0, 10)).run();
                    subjectId = newSub.meta.last_row_id as number;
                    subjectSysMap.set(searchName, subjectId);
                }
            }

            const existingGradeId = gradeMap.get(`${studentId}-${subjectId}`);

            if (existingGradeId) {
                statements.push(
                    db.prepare(`UPDATE grades SET partial_1=?, partial_2=?, partial_3=?, final_score=?, acred_type=? WHERE id=?`)
                      .bind(g.partial_1, g.partial_2, g.partial_3, g.final_score, g.acred_type, existingGradeId)
                );
            } else {
                statements.push(
                    db.prepare(`INSERT INTO grades (student_id, period_id, subject_id, partial_1, partial_2, partial_3, final_score, acred_type, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sisems')`)
                      .bind(studentId, periodId, subjectId, g.partial_1, g.partial_2, g.partial_3, g.final_score, g.acred_type)
                );
            }
            gradesImported++;

            if (statements.length >= 100) {
                await db.batch(statements);
                statements.length = 0;
            }
        }
        
        if (statements.length > 0) {
            await db.batch(statements);
            statements.length = 0;
        }
    }

    return { studentsUpserted, gradesImported, groupsCreated };
}

// ── Helpers ──

function parseScore(value: unknown): number | null {
    if (value === null || value === undefined || value === "" || value === "None") return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
}

function normalizeGeneration(gen: string): string {
    // Normalize "2024-2027" → "2024 - 2027"
    return gen.trim().replace(/(\d{4})\s*-\s*(\d{4})/, "$1 - $2");
}

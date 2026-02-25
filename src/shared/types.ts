// Shared types between frontend and backend

// ── Roles ──
export type UserRole = "admin" | "teacher" | "prefect" | "student" | "parent";

// ── Users ──
export interface User {
    id: number;
    email: string;
    role: UserRole;
    display_name: string;
    active: boolean;
    created_at: string;
}

// ── Students ──
export interface Student {
    id: number;
    user_id: number | null;
    no_control: string;
    curp: string;
    name: string;
    paterno: string;
    materno: string;
    career: string;
    generation: string;
    semester: number;
    grupo: string;
    blood_type: string | null;
    nss: string | null;
    photo_url: string | null;
    active: boolean;
    created_at: string;
}

// ── Guardians ──
export interface Guardian {
    id: number;
    student_id: number;
    name: string;
    relationship: string;
    phone: string;
    phone_alt: string | null;
    email: string | null;
}

// ── Teachers ──
export interface Teacher {
    id: number;
    user_id: number | null;
    xml_id: string | null;
    name: string;
    short_name: string;
    specialty: string | null;
}

// ── Specialties ──
export interface Specialty {
    id: number;
    name: string;
    code: string; // ACUA, PIA, RSIA
}

// ── Periods ──
export interface Period {
    id: number;
    name: string;
    year: number;
    semester_type: "odd" | "even";
    start_date: string;
    end_date: string;
    active: boolean;
}

// ── Groups ──
export interface Group {
    id: number;
    period_id: number;
    name: string;
    semester: number;
    specialty_id: number | null;
}

// ── Subjects ──
export interface Subject {
    id: number;
    xml_id: string | null;
    name: string;
    short_code: string;
    semester: number | null;
    specialty_id: number | null;
}

// ── Schedules ──
export interface Schedule {
    id: number;
    group_id: number;
    subject_id: number;
    teacher_id: number;
    day: number; // 1=Lu, 2=Ma, 3=Mi, 4=Ju, 5=Vi
    period_num: number; // 1-7
    classroom: string | null;
}

// ── Grades ──
export interface Grade {
    id: number;
    student_id: number;
    subject_id: number | null;
    period_id: number;
    partial_1: number | null;
    partial_2: number | null;
    partial_3: number | null;
    final_score: number | null;
    acred_type: string | null;
    source: "sisems" | "manual";
}

// ── Attendance ──
export interface Attendance {
    id: number;
    student_id: number;
    schedule_id: number;
    date: string;
    status: "present" | "absent" | "late" | "justified";
    marked_by: number;
}

// ── Conduct Reports ──
export interface ConductReport {
    id: number;
    student_id: number;
    reported_by: number;
    type: "warning" | "suspension" | "note";
    description: string;
    date: string;
    resolved: boolean;
}

// ── Credentials ──
export interface Credential {
    id: number;
    student_id: number;
    qr_token: string;
    issued_at: string;
    expires_at: string;
    active: boolean;
}

// ── Entry Logs ──
export interface EntryLog {
    id: number;
    student_id: number;
    direction: "in" | "out";
    scanned_by: number;
    timestamp: string;
}

// ── Auth ──
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: Omit<User, "created_at">;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

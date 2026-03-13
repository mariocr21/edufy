export interface StudentListItem {
    id: number;
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
    primary_phone?: string;
    guardian_name?: string;
}

export interface StudentGuardian {
    id: number;
    student_id: number;
    name: string;
    relationship: string;
    phone: string;
    phone_alt: string | null;
    email: string | null;
}

export interface StudentDocument {
    id: number;
    student_id: number;
    document_type: string;
    file_key: string;
    file_name: string;
    content_type: string;
    uploaded_by: number | null;
    uploaded_at: string;
    download_url: string;
    is_primary: boolean;
}

export interface StudentIncident {
    id: number;
    report_type?: "amonestacion" | "suspension" | "nota";
    type?: "warning" | "suspension" | "note";
    description: string;
    date: string;
    created_at?: string;
    reported_by_name?: string;
}

export interface StudentChecklistItem {
    document_type: string;
    status: "uploaded" | "missing";
}

export interface StudentProfileData {
    student: StudentListItem;
    guardians: StudentGuardian[];
    documents: StudentDocument[];
    recent_incidents: StudentIncident[];
    document_checklist: StudentChecklistItem[];
}

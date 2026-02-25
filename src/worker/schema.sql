-- Sistema Escolar CETMAR 42 - Initial Schema
-- Cloudflare D1 (SQLite)

-- ── Users ──
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'prefect', 'student', 'parent')),
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Specialties ──
CREATE TABLE IF NOT EXISTS specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO specialties (name, code) VALUES
  ('Técnico en Acuacultura', 'ACUA'),
  ('Técnico en Producción Industrial de Alimentos', 'PIA'),
  ('Técnico en Responsabilidad Social e Inocuidad Alimentaria', 'RSIA');

-- ── Teachers ──
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  xml_id TEXT,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  specialty TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Students ──
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  no_control TEXT UNIQUE NOT NULL,
  curp TEXT,
  name TEXT NOT NULL,
  paterno TEXT NOT NULL,
  materno TEXT,
  career TEXT,
  generation TEXT,
  semester INTEGER,
  grupo TEXT,
  blood_type TEXT,
  nss TEXT,
  photo_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Guardians ──
CREATE TABLE IF NOT EXISTS guardians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_alt TEXT,
  email TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ── Periods ──
CREATE TABLE IF NOT EXISTS periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester_type TEXT NOT NULL CHECK (semester_type IN ('odd', 'even')),
  start_date TEXT,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO periods (name, year, semester_type, start_date, end_date, active)
  VALUES ('SEMESTRAL 1 - 2025', 2025, 'odd', '2025-02-01', '2025-07-31', 1);

-- ── Groups ──
CREATE TABLE IF NOT EXISTS groups_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  semester INTEGER NOT NULL,
  specialty_id INTEGER,
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (specialty_id) REFERENCES specialties(id)
);

-- ── Group Students (junction) ──
CREATE TABLE IF NOT EXISTS group_students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups_table(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE (group_id, student_id)
);

-- ── Subjects ──
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  xml_id TEXT,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  semester INTEGER,
  specialty_id INTEGER,
  FOREIGN KEY (specialty_id) REFERENCES specialties(id)
);

-- ── Schedules ──
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 5),
  period_num INTEGER NOT NULL CHECK (period_num BETWEEN 1 AND 7),
  classroom TEXT,
  FOREIGN KEY (group_id) REFERENCES groups_table(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- ── Grades ──
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject_id INTEGER,
  period_id INTEGER NOT NULL,
  partial_1 REAL,
  partial_2 REAL,
  partial_3 REAL,
  final_score REAL,
  acred_type TEXT,
  source TEXT NOT NULL DEFAULT 'sisems' CHECK (source IN ('sisems', 'manual')),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (period_id) REFERENCES periods(id)
);

-- ── Attendance ──
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  schedule_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'justified')),
  marked_by INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id),
  FOREIGN KEY (marked_by) REFERENCES users(id)
);

-- ── Conduct Reports ──
CREATE TABLE IF NOT EXISTS conduct_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  reported_by INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warning', 'suspension', 'note')),
  description TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  resolved INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (reported_by) REFERENCES users(id)
);

-- ── Credentials ──
CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- ── Entry Logs ──
CREATE TABLE IF NOT EXISTS entry_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  scanned_by INTEGER,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (scanned_by) REFERENCES users(id)
);

-- ── Seed admin user (password: admin123 - CHANGE IN PRODUCTION) ──
-- bcrypt hash for 'admin123'
INSERT OR IGNORE INTO users (email, password_hash, role, display_name)
  VALUES ('admin@cetmar42.edu.mx', '$2a$10$rQdE3/cKPx6YPuE1e0Wz8OZ.YzYz7Khl4gU3PBwTqHfH9K5LhH.jC', 'admin', 'Administrador CETMAR 42');

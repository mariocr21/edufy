---
name: sistema-escolar-cetmar42
description: Guía de arquitectura y contexto para el "Sistema Escolar para Preparatoria de la SEMS, CETMAR 42". Usa esta skill obligatoriamente cada vez que trabajes en este proyecto para garantizar el uso correcto de las herramientas del stack (React 19, Hono, Cloudflare Workers, Tailwind, Zustand, Zod, jspdf, xlsx, etc.) y mantener un código eficiente, escalable y moderno.
---

# Sistema Escolar CETMAR 42

## Contexto del Plantel
- **Subsistema**: SEMS / DGECYTM (Centro de Estudios Tecnológicos del Mar No. 42)
- **Especialidades**: Acuacultura (ACUA), Producción Industrial de Alimentos (PIA), Responsabilidad Social e Inocuidad Alimentaria (RSIA)
- **Grupos**: 1er semestre genéricos (`1A`, `1B`, `1C`). Del 2do en adelante por especialidad (`2 ACUA A`, `3 PIA B`, etc.)
- **Calificaciones**: 3 parciales por semestre, escala **5–10**, mínimo aprobatorio **6.0**
- **Roles**: Administrativo, Docente, Prefectura, Alumno, Padre/Tutor

## Stack Tecnológico

### Frontend
| Herramienta | Uso |
|---|---|
| React 19 + Vite + TS | SPA core |
| React Router 7 | Enrutamiento con rutas protegidas por rol |
| Tailwind CSS | Estilos responsive |
| Zustand | Estado global (auth, notificaciones) |
| lucide-react | Iconografía |
| Recharts | Dashboards y gráficas |
| jspdf + jspdf-autotable | Exportación PDF (actas, credenciales) |
| xlsx | Exportación Excel (listas, reportes) |
| react-qr-code | QR en credenciales digitales |

### Backend
| Herramienta | Uso |
|---|---|
| Hono | Framework API REST en Workers |
| @hono/zod-validator | Validación de entrada en endpoints |
| Zod | Esquemas compartidos frontend/backend |
| bcryptjs | Hash de contraseñas |
| date-fns | Manejo de fechas |
| Cloudflare Workers + D1 | Runtime serverless + SQLite distribuido |

## Reglas de Desarrollo

1. **Modularidad backend**: Rutas Hono separadas por dominio (`/api/auth`, `/api/students`, `/api/grades`, `/api/prefectura`).
2. **Validación estricta**: Todo POST/PUT/PATCH usa `zodValidator` de `@hono/zod-validator`.
3. **Tipado fuerte**: Inferir tipos TS desde esquemas Zod (`z.infer<typeof schema>`). Compartir tipos entre frontend y backend.
4. **Bindings D1**: Acceder a la BD siempre via `c.env.DB` con interfaz Bindings tipada.
5. **UI en español**: Interfaces 100% en español. Variables de código pueden ser en inglés.
6. **UX**: Loading states, validación client-side antes de submit, feedback inmediato.
7. **Exportación universal**: Toda tabla/lista debe tener botones "Exportar PDF" y "Exportar Excel".

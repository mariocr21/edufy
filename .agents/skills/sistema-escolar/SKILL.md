---
name: sistema-escolar-cetmar42
description: Use when working on the "Sistema Escolar para Preparatoria de la SEMS, CETMAR 42" project to preserve its architecture, stack conventions, and integral delivery expectations.
---

# Sistema Escolar CETMAR 42

## Contexto del Plantel
- **Subsistema**: SEMS / DGECYTM (Centro de Estudios Tecnologicos del Mar No. 42)
- **Especialidades**: Acuacultura (ACUA), Produccion Industrial de Alimentos (PIA), Responsabilidad Social e Inocuidad Alimentaria (RSIA)
- **Grupos**: 1er semestre genericos (`1A`, `1B`, `1C`). Del 2do en adelante por especialidad (`2 ACUA A`, `3 PIA B`, etc.)
- **Calificaciones**: 3 parciales por semestre, escala **5-10**, minimo aprobatorio **6.0**
- **Roles**: Administrativo, Docente, Prefectura, Alumno, Padre/Tutor

## Stack Tecnologico

### Frontend
| Herramienta | Uso |
|---|---|
| React 19 + Vite + TS | SPA core |
| React Router 7 | Enrutamiento con rutas protegidas por rol |
| Tailwind CSS | Estilos responsive |
| Zustand | Estado global (auth, notificaciones) |
| lucide-react | Iconografia |
| Recharts | Dashboards y graficas |
| jspdf + jspdf-autotable | Exportacion PDF |
| xlsx | Exportacion Excel |
| react-qr-code | QR en credenciales digitales |

### Backend
| Herramienta | Uso |
|---|---|
| Hono | Framework API REST en Workers |
| @hono/zod-validator | Validacion de entrada en endpoints |
| Zod | Esquemas compartidos frontend/backend |
| bcryptjs | Hash de contrasenas |
| date-fns | Manejo de fechas |
| Cloudflare Workers + D1 | Runtime serverless + SQLite distribuido |

## Reglas de Desarrollo
1. **Modularidad backend**: Rutas Hono separadas por dominio (`/api/auth`, `/api/students`, `/api/grades`, `/api/prefectura`).
2. **Validacion estricta**: Todo POST/PUT/PATCH usa `zodValidator` de `@hono/zod-validator`.
3. **Tipado fuerte**: Inferir tipos TS desde esquemas Zod (`z.infer<typeof schema>`). Compartir tipos entre frontend y backend.
4. **Bindings D1**: Acceder a la BD siempre via `c.env.DB` con interfaz `Bindings` tipada.
5. **UI en espanol**: Interfaces 100% en espanol. Variables de codigo pueden ser en ingles.
6. **UX**: Loading states, validacion client-side antes de submit, feedback inmediato.
7. **Exportacion universal**: Toda tabla o lista debe tener botones "Exportar PDF" y "Exportar Excel".
8. **Implementacion integral**: Si una funcionalidad requiere backend y frontend, se implementa completa en el mismo batch para entregar un flujo usable de extremo a extremo.

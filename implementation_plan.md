# Plan Integral de Cierre — Sistema Escolar CETMAR 42

## Propósito

Este documento reemplaza el plan anterior con un roadmap alineado al estado real del repositorio. El proyecto ya cuenta con múltiples módulos implementados parcialmente, por lo que el objetivo ya no es "crear desde cero", sino **estabilizar la base técnica, completar la operación diaria y cerrar los módulos administrativos pendientes** en el mejor orden posible.

## Estado Real del Proyecto

### Módulos ya presentes en el repositorio

Los siguientes módulos ya existen como rutas backend y/o pantallas frontend:

| Módulo | Backend | Frontend | Estado real |
|--------|---------|----------|-------------|
| Autenticación | `auth.ts` | `LoginPage.tsx` | Funcional |
| Importación SISEMS | `sisems.ts`, `import.ts` | `ImportPage.tsx` | Funcional |
| Importación horarios aSc | `asc-timetables.ts` | `ImportPage.tsx` | Funcional |
| Alumnos | `students.ts` | `StudentsPage.tsx` | Funcional, expandible |
| Docentes | `teachers.ts` | `TeachersPage.tsx` | Funcional, falta vinculación con usuarios |
| Dashboard | `dashboard.ts` | `DashboardPage.tsx` | Básico |
| Asistencia | `attendance.ts` | `AttendancePage.tsx` | Implementado, depende de vínculos y RBAC sólidos |
| Calificaciones | `grades.ts` | `GradesPage.tsx` | Implementado, faltan cierres funcionales |
| Prefectura | `conduct.ts` | `PrefectPage.tsx` | Implementado, requiere estabilización |
| Credenciales | `credentials.ts` | `CredentialsPage.tsx` | Implementado, requiere pulido |
| Trámites / documentos | `documents.ts` | `ConstanciasPage.tsx` | Implementado parcialmente |

### Hallazgos que cambian el orden de trabajo

1. La operación diaria depende de una base técnica todavía incompleta.
2. Existen inconsistencias probables entre esquema D1, nombres de columnas y contratos usados por rutas.
3. La asistencia docente depende del vínculo `teachers.user_id`, así que no debe quedar hasta el final.
4. El plan anterior marcaba como nuevos módulos que ya existen en el repositorio.
5. `npx tsc --noEmit` pasa actualmente, pero `npm run lint` no es confiable porque falta configuración actualizada de ESLint.

## Objetivo de Cierre

Entregar un sistema usable y estable para el plantel con:

- autenticación y autorización por rol confiables,
- vínculos reales entre cuentas y perfiles,
- módulos operativos completos para el uso diario,
- flujos administrativos mínimos para sostener la operación,
- validación técnica suficiente para iterar sin romper funcionalidades existentes.

---

## Roadmap Integral Recomendado

### Fase 0: Estabilización Técnica Base

**Objetivo:** Dejar una plataforma coherente antes de seguir ampliando módulos.

#### Alcance
- Revisar y alinear `schema.sql` con las rutas actuales.
- Detectar y corregir diferencias entre nombres de columnas, enums y payloads usados en frontend/backend.
- Corregir la estrategia de validación automática del proyecto:
  - `npx tsc --noEmit`
  - `npm run lint` o sustituirlo por una configuración funcional
- Estandarizar respuestas API (`success`, `data`, `error`) en módulos críticos.
- Revisar binds y tipado de `Bindings` para D1 y R2.

#### Entregables
- Esquema D1 consistente con el código vivo.
- Lint/build ejecutables como baseline.
- Lista de deudas técnicas resueltas antes de tocar flujos operativos.

#### Archivos probables
- `src/worker/schema.sql`
- `src/worker/index.ts`
- `src/worker/bindings.ts`
- `package.json`
- configuración ESLint faltante

---

### Fase 1: Identidad, RBAC y Vinculación de Usuarios

**Objetivo:** Garantizar que cada rol vea y haga únicamente lo que le corresponde.

#### Alcance
- Fortalecer middleware de autenticación y autorización.
- Vincular cuentas de usuario con docentes.
- Preparar vinculación de cuentas con alumnos.
- Restringir consultas y acciones por rol:
  - admin: acceso total
  - teacher: grupos, horario, asistencia y datos propios
  - prefect: incidencias, credenciales, control de acceso
- Agregar UI administrativa para vincular usuarios a docentes.

#### Razón de prioridad
Sin esta fase, asistencia y vistas filtradas por usuario no quedan operables de forma confiable.

#### Entregables
- Docente autenticado puede consultar su horario real.
- Rutas sensibles protegidas con RBAC real.
- Tabla/listado de docentes muestra usuario vinculado.

#### Archivos probables
- `src/worker/middleware/auth.ts`
- `src/worker/routes/auth.ts`
- `src/worker/routes/teachers.ts`
- `src/client/pages/TeachersPage.tsx`
- futuros `users.ts` y `UsersPage.tsx`

---

### Fase 2: Módulo de Asistencia Operativa

**Objetivo:** Entregar el primer flujo operativo completo del sistema.

#### Alcance
- Validar horario del docente por fecha.
- Corregir restricciones de acceso a grupos y reportes.
- Completar flujo de pase de lista por clase.
- Endurecer reporte general de asistencia por filtros.
- Preparar exportación PDF/Excel para reportes.
- Verificar guardado idempotente y edición de lista ya capturada.

#### Resultado esperado
Un docente autenticado puede entrar, ver sus clases del día y pasar lista correctamente.

#### Archivos probables
- `src/worker/routes/attendance.ts`
- `src/client/pages/AttendancePage.tsx`
- `src/client/components/layout/AppLayout.tsx`
- utilidades de exportación si hacen falta

---

### Fase 3: Módulo de Calificaciones

**Objetivo:** Cerrar consulta y análisis académico de información importada.

#### Alcance
- Alinear endpoint y shape de datos de calificaciones con la base real.
- Completar filtros por período, grupo y especialidad si aplica.
- Agregar exportación PDF y Excel.
- Mostrar estadísticas confiables por período y grupo.
- Definir si habrá edición manual o si este módulo será solo de consulta SISEMS en la primera versión estable.

#### Entregables
- Vista estable de calificaciones por grupo.
- Estadísticas útiles para dirección y control escolar.
- Exportación funcional.

#### Archivos probables
- `src/worker/routes/grades.ts`
- `src/client/pages/GradesPage.tsx`
- soporte de `xlsx` y `jspdf`

---

### Fase 4: Módulo de Prefectura

**Objetivo:** Habilitar incidencias disciplinarias con historial confiable.

#### Alcance
- Revisar consistencia entre tabla `conduct_reports` y rutas actuales.
- Normalizar tipos de reporte y nombres de campos.
- Completar historial por alumno.
- Agregar filtros por fecha, alumno y tipo.
- Valorar exportación PDF por alumno o por rango.

#### Entregables
- Alta y baja de incidencias funcionando.
- Historial usable para prefectura y dirección.

#### Archivos probables
- `src/worker/routes/conduct.ts`
- `src/client/pages/PrefectPage.tsx`
- `src/client/pages/StudentsPage.tsx` para vista relacionada

---

### Fase 5: Credenciales y Control de Acceso

**Objetivo:** Cerrar el flujo físico-operativo de credenciales QR.

#### Alcance
- Revisar consistencia entre `credentials`, `entry_logs` y las rutas actuales.
- Corregir o completar generación de QR.
- Sustituir placeholder del PDF por credencial real imprimible.
- Validar escaneo de entrada y salida.
- Mejorar bitácora diaria y filtros.

#### Entregables
- Generación masiva de credenciales útil.
- Registro de acceso confiable.
- PDF de credenciales listo para impresión.

#### Archivos probables
- `src/worker/routes/credentials.ts`
- `src/client/pages/CredentialsPage.tsx`

---

### Fase 6: Trámites y Expediente Digital

**Objetivo:** Completar el uso de R2 y el expediente documental del alumno.

#### Alcance
- Confirmar tablas `student_documents` y `document_requests`.
- Completar flujo de carga, consulta y descarga de documentos.
- Integrar expediente digital dentro del detalle del alumno.
- Completar administración de solicitudes de constancias/trámites.
- Definir permisos para carga, consulta y procesamiento.

#### Entregables
- Expediente digital básico por alumno.
- Gestión inicial de trámites escolares.

#### Archivos probables
- `src/worker/routes/documents.ts`
- `src/client/pages/ConstanciasPage.tsx`
- `src/client/pages/StudentsPage.tsx`
- configuración/bindings de R2

---

### Fase 7: Gestión Administrativa de Usuarios y Catálogos

**Objetivo:** Dar sostenibilidad al sistema para operación real.

#### Alcance
- Crear gestión de usuarios:
  - altas
  - activación/desactivación
  - reseteo de contraseña
- Crear gestión de materias/catalogos académicos.
- Preparar vinculación de alumnos con sus cuentas cuando aplique.
- Añadir vistas administrativas faltantes.

#### Entregables
- Administración de usuarios sin depender de SQL manual.
- Catálogo académico administrable.

#### Archivos nuevos probables
- `src/worker/routes/users.ts`
- `src/client/pages/UsersPage.tsx`
- `src/worker/routes/subjects.ts`
- `src/client/pages/SubjectsPage.tsx`

---

### Fase 8: Dashboard, Analítica y Cierre de Producto

**Objetivo:** Convertir el sistema en una herramienta de seguimiento y no solo de captura.

#### Alcance
- Mejorar KPIs del dashboard.
- Agregar tendencias de asistencia.
- Agregar alertas académicas y de riesgo.
- Integrar indicadores para dirección.
- Revisar consistencia visual y UX general del sistema.

#### Entregables
- Dashboard realmente útil para dirección y control escolar.
- Cierre visual y funcional del producto.

#### Archivos probables
- `src/client/pages/DashboardPage.tsx`
- `src/worker/routes/dashboard.ts`

---

## Orden de Ejecución Recomendado

### Bloque 1: Fundaciones
1. Fase 0
2. Fase 1

### Bloque 2: Operación diaria
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5

### Bloque 3: Operación ampliada y cierre
7. Fase 6
8. Fase 7
9. Fase 8

## Criterios para considerar una fase terminada

Cada fase debe cumplir lo siguiente:

1. Compila sin errores TypeScript.
2. Sus rutas principales responden correctamente.
3. El flujo principal se valida manualmente con sesión real.
4. El acceso por rol está probado en el escenario principal.
5. No deja placeholders críticos en UI.

## Estrategia de Verificación

### Verificación técnica

```bash
cd "c:\Users\Neurona\Desktop\Sistema escolar"
npx tsc --noEmit
npm run lint
```

> Nota: si `npm run lint` sigue fallando por configuración faltante, la primera tarea de la Fase 0 será corregir ese baseline.

### Verificación manual por fase

1. Ejecutar `npm run dev`
2. Iniciar sesión con el rol correspondiente
3. Probar el flujo principal de la fase
4. Confirmar persistencia correcta en D1
5. Validar comportamiento de permisos

## Propuesta de Arranque Inmediato

Para comenzar con el mejor retorno técnico y funcional, el primer sprint debería cubrir:

1. Fase 0 parcial:
   - baseline de lint/build
   - revisión de consistencia esquema-rutas
2. Fase 1 parcial:
   - vínculo `teacher.user_id`
   - RBAC real para horario y asistencia
3. Fase 2 parcial:
   - flujo completo docente -> horario -> pase de lista -> guardado

Con eso el sistema obtiene su primer flujo operativo serio sin construir sobre una base frágil.

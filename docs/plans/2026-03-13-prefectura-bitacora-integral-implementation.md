# Prefectura Bitacora Integral Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir una bitacora integral de Prefectura para registrar eventos del alumno, justificar faltas desde prefectura y generar mensajes sugeridos de WhatsApp con trazabilidad.

**Architecture:** Se agregara una tabla nueva de eventos de prefectura y endpoints propios para timeline, justificaciones y mensajeria sugerida. El frontend de Prefectura se reorganizara alrededor de acciones rapidas y timeline del alumno, reutilizando el perfil consolidado donde convenga.

**Tech Stack:** React 19, React Router 7, Tailwind CSS, Hono, Zod, Cloudflare Workers, D1

---

### Task 1: Definir el modelo de bitacora de prefectura

**Files:**
- Modify: `src/worker/schema.sql`
- Modify: `src/worker/bindings.ts` solo si se agregan tipos auxiliares
- Review: `src/worker/routes/attendance.ts`
- Review: `src/worker/routes/conduct.ts`

**Step 1: Agregar tabla `prefecture_events`**

- Incluir columnas:
  - `id`
  - `student_id`
  - `event_type`
  - `event_date`
  - `summary`
  - `details`
  - `created_by`
  - `related_attendance_id`
  - `related_conduct_id`
  - `guardian_id`
  - `whatsapp_message`
  - `whatsapp_opened_at`
  - `created_at`

**Step 2: Restringir tipos de evento iniciales**

- Permitir:
  - `conducta`
  - `falta_justificada`
  - `retardo`
  - `salida`
  - `citatorio`
  - `contacto_tutor`
  - `observacion`

**Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/worker/schema.sql src/worker/bindings.ts
git commit -m "feat: add prefecture events schema"
```

### Task 2: Crear endpoints base de timeline y eventos

**Files:**
- Create or Modify: `src/worker/routes/prefecture.ts`
- Modify: `src/worker/index.ts`
- Review: `src/worker/routes/students.ts`

**Step 1: Crear rutas de prefectura**

- `GET /api/prefecture/students/:id/timeline`
- `POST /api/prefecture/events`
- `POST /api/prefecture/events/:id/mark-whatsapp-opened`

**Step 2: Validar payloads con Zod**

- `event_type`
- `event_date`
- `summary`
- `details`
- referencias opcionales

**Step 3: Ordenar timeline**

- por `event_date DESC`
- desempate por `created_at DESC`

**Step 4: Verificar**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 5: Commit**

```bash
git add src/worker/routes/prefecture.ts src/worker/index.ts
git commit -m "feat: add prefecture timeline endpoints"
```

### Task 3: Implementar justificacion formal de faltas

**Files:**
- Modify: `src/worker/routes/prefecture.ts`
- Modify: `src/worker/routes/attendance.ts`
- Review: `src/client/pages/AttendancePage.tsx`

**Step 1: Crear endpoint de justificacion**

- `POST /api/prefecture/attendance/:id/justify`

**Step 2: Aplicar regla de negocio**

- cambiar `attendance.status` a `justified`
- crear evento `falta_justificada`
- guardar motivo, fecha y usuario

**Step 3: Preparar consumo docente**

- revisar reportes y listados donde `justified` deba contarse como asistencia

**Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores

Run: `npm run build`
Expected: build exitoso

**Step 5: Commit**

```bash
git add src/worker/routes/prefecture.ts src/worker/routes/attendance.ts src/client/pages/AttendancePage.tsx
git commit -m "feat: justify absences from prefecture workflow"
```

### Task 4: Integrar conducta con la bitacora

**Files:**
- Modify: `src/worker/routes/conduct.ts`
- Modify: `src/worker/routes/prefecture.ts`

**Step 1: Registrar evento espejo de conducta**

- al crear reporte disciplinario, tambien registrar evento `conducta`

**Step 2: Mantener compatibilidad con esquema legacy**

- no romper `type/report_type`
- no romper instalaciones sin `created_at`

**Step 3: Verificar**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/worker/routes/conduct.ts src/worker/routes/prefecture.ts
git commit -m "feat: mirror conduct reports into prefecture timeline"
```

### Task 5: Generar mensajes sugeridos para WhatsApp

**Files:**
- Modify: `src/worker/routes/prefecture.ts`
- Optionally Create: `src/shared/prefecture.ts`

**Step 1: Crear generador de mensajes**

- por tipo de evento
- con nombre del alumno
- grupo
- fecha
- resumen del evento

**Step 2: Exponer preview**

- `POST /api/prefecture/events/:id/whatsapp-preview`
- responder con telefono destino y mensaje sugerido

**Step 3: Marcar apertura manual**

- `POST /api/prefecture/events/:id/mark-whatsapp-opened`
- guardar `whatsapp_opened_at`

**Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 5: Commit**

```bash
git add src/worker/routes/prefecture.ts src/shared/prefecture.ts
git commit -m "feat: add whatsapp preview support for prefecture events"
```

### Task 6: Expandir el panel de Prefectura con acciones rapidas

**Files:**
- Modify: `src/client/pages/PrefectPage.tsx`
- Reuse: `src/client/components/students/StudentProfileCard.tsx`
- Optionally Create: `src/client/components/prefecture/PrefectureQuickActions.tsx`

**Step 1: Agregar bloque de acciones**

- Registrar conducta
- Justificar falta
- Registrar retardo
- Registrar salida
- Crear citatorio
- Agregar observacion
- Notificar tutor

**Step 2: Reorganizar experiencia**

- priorizar seleccion de alumno
- mantener flujo rapido para captura

**Step 3: Verificar**

Run: `npm run lint`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/client/pages/PrefectPage.tsx src/client/components/prefecture
git commit -m "feat: add quick actions to prefecture module"
```

### Task 7: Agregar timeline integral del alumno en Prefectura

**Files:**
- Modify: `src/client/pages/PrefectPage.tsx`
- Optionally Create: `src/client/components/prefecture/PrefectureTimeline.tsx`

**Step 1: Consumir el timeline**

- cargar `GET /api/prefecture/students/:id/timeline`
- mostrar lista cronologica

**Step 2: Mostrar metadata util**

- tipo de evento
- fecha
- responsable
- detalle
- estado de WhatsApp

**Step 3: Integrar con perfil rapido**

- mostrar timeline en el drawer o panel lateral del alumno

**Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores

Run: `npm run build`
Expected: build exitoso

**Step 5: Commit**

```bash
git add src/client/pages/PrefectPage.tsx src/client/components/prefecture
git commit -m "feat: add prefecture student timeline"
```

### Task 8: Cerrar reglas de asistencia y pulir UX

**Files:**
- Modify: `src/client/pages/AttendancePage.tsx`
- Modify: `src/client/pages/PrefectPage.tsx`
- Review: `src/worker/routes/attendance.ts`
- Review: `src/worker/routes/prefecture.ts`

**Step 1: Reflejar `justified` como asistencia valida**

- ajustar contadores, etiquetas o resumenes donde aplique

**Step 2: Eliminar alerts en flujos nuevos**

- usar feedback inline consistente

**Step 3: Revisar textos en espanol**

- sin mezcla innecesaria de ingles en UI

**Step 4: Verificar**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

Run: `npm run build`
Expected: build exitoso

**Step 5: Commit**

```bash
git add src/client/pages/AttendancePage.tsx src/client/pages/PrefectPage.tsx src/worker/routes/attendance.ts src/worker/routes/prefecture.ts src/client/components/prefecture
git commit -m "feat: complete prefecture integral timeline workflow"
```

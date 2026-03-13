# Alumno 360 y Panel Rapido de Prefectura Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir una ficha integral del alumno reutilizable en `Alumnos` y `Prefectura`, cerrando tutores, expediente digital y consulta rapida operativa.

**Architecture:** El backend expondrá un perfil consolidado del alumno y subrutas para tutores y documentos. El frontend reutilizará una ficha comun para mostrar datos escolares, salud, contacto, tutores, expediente e incidencias tanto en el modulo de alumnos como en prefectura.

**Tech Stack:** React 19, React Router 7, Tailwind CSS, Zustand, Hono, Zod, Cloudflare Workers, D1, R2

---

### Task 1: Corregir contratos de busqueda y detalle de alumnos

**Files:**
- Modify: `src/worker/routes/students.ts`
- Modify: `src/client/pages/PrefectPage.tsx`
- Test: verificacion manual con `npm run lint`, `npx tsc --noEmit`, `npm run build`

**Step 1: Ajustar la busqueda de alumnos para soportar el contrato real**

- En `src/worker/routes/students.ts`, aceptar tanto `search` como `q` durante la transicion.
- Soportar `limit` para consultas ligeras desde prefectura.

**Step 2: Corregir el consumo desde prefectura**

- En `src/client/pages/PrefectPage.tsx`, reemplazar la consulta actual por el contrato alineado.
- Eliminar el pseudo debounce roto y usar un `useEffect` o temporizador controlado correctamente.

**Step 3: Verificar**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/worker/routes/students.ts src/client/pages/PrefectPage.tsx
git commit -m "fix: align prefect search with students api"
```

### Task 2: Crear endpoint de perfil consolidado del alumno

**Files:**
- Modify: `src/worker/routes/students.ts`
- Review: `src/worker/routes/conduct.ts`
- Review: `src/worker/routes/documents.ts`

**Step 1: Agregar `GET /api/students/:id/profile`**

- Regresar un objeto con:
  - `student`
  - `guardians`
  - `documents`
  - `recent_incidents`
  - `document_checklist`

**Step 2: Construir checklist minimo**

- Base inicial:
  - `photo`
  - `acta_nacimiento`
  - `curp`
  - `certificado_secundaria`
  - `comprobante_domicilio`
- Regresar estado `uploaded` o `missing`.

**Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/worker/routes/students.ts
git commit -m "feat: add consolidated student profile endpoint"
```

### Task 3: Implementar CRUD de tutores

**Files:**
- Modify: `src/worker/routes/students.ts`
- Possibly Modify: `src/worker/schema.sql` solo si hace falta ajustar columnas o constraints

**Step 1: Agregar subrutas de tutores**

- `POST /api/students/:id/guardians`
- `PUT /api/students/:id/guardians/:guardianId`
- `DELETE /api/students/:id/guardians/:guardianId`

**Step 2: Validar payloads**

- Campos minimos:
  - `name`
  - `relationship`
  - `phone`
- Opcionales:
  - `phone_alt`
  - `email`

**Step 3: Verificar**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/worker/routes/students.ts src/worker/schema.sql
git commit -m "feat: add guardians crud for student profiles"
```

### Task 4: Endurecer documentos y foto principal

**Files:**
- Modify: `src/worker/routes/documents.ts`
- Modify: `src/worker/routes/students.ts`

**Step 1: Mejorar respuesta de documentos**

- Devolver tipos consistentes.
- Validar tipos permitidos.
- Preparar indicador de documento principal.

**Step 2: Vincular foto con perfil**

- Si se sube un `document_type = photo`, actualizar `students.photo_url` o resolver una ruta reutilizable.

**Step 3: Agregar borrado de documentos**

- Implementar endpoint para eliminar metadata y archivo en R2.

**Step 4: Verificar**

Run: `npm run build`
Expected: build exitoso

**Step 5: Commit**

```bash
git add src/worker/routes/documents.ts src/worker/routes/students.ts
git commit -m "feat: connect student photo and document lifecycle"
```

### Task 5: Crear componente reutilizable de ficha de alumno

**Files:**
- Create: `src/client/components/students/StudentProfileCard.tsx`
- Create: `src/client/components/students/StudentProfileSections.tsx`
- Optionally Create: `src/client/components/students/StudentProfileChecklist.tsx`

**Step 1: Crear componente base**

- Mostrar foto, nombre, matricula, grupo, semestre, carrera.
- Mostrar estado de carga y error.

**Step 2: Agregar secciones**

- datos generales
- salud y contacto
- tutores
- documentos
- incidencias recientes

**Step 3: Verificar**

Run: `npm run lint`
Expected: sin errores

**Step 4: Commit**

```bash
git add src/client/components/students
git commit -m "feat: add reusable student profile components"
```

### Task 6: Expandir Alumnos a ficha 360

**Files:**
- Modify: `src/client/pages/StudentsPage.tsx`
- Reuse: `src/client/components/students/StudentProfileCard.tsx`
- Reuse: `src/client/components/students/StudentProfileSections.tsx`

**Step 1: Reemplazar modal limitado por ficha mas completa**

- Mantener alta y edicion basica.
- Agregar carga del perfil consolidado al editar alumno.

**Step 2: Integrar tutores**

- Formulario para alta/edicion/eliminacion dentro de la ficha.

**Step 3: Integrar expediente digital**

- Reutilizar lista y upload.
- Mostrar checklist de faltantes.

**Step 4: Eliminar `alert` y mejorar feedback**

- Mensajes inline para guardado, error y carga.

**Step 5: Verificar**

Run: `npm run build`
Expected: build exitoso

**Step 6: Commit**

```bash
git add src/client/pages/StudentsPage.tsx src/client/components/students
git commit -m "feat: turn students page into alumno 360 workflow"
```

### Task 7: Crear panel rapido en prefectura

**Files:**
- Modify: `src/client/pages/PrefectPage.tsx`
- Reuse: `src/client/components/students/StudentProfileCard.tsx`

**Step 1: Agregar panel lateral o drawer**

- Abrir al seleccionar alumno desde la busqueda.
- Mostrar perfil rapido sin salir del flujo de incidencia.

**Step 2: Permitir abrir perfil desde reportes recientes**

- Accion sobre fila para inspeccionar alumno reportado.

**Step 3: Usar datos reales del perfil**

- foto
- contacto
- tutor principal
- incidencias recientes
- documentos principales

**Step 4: Verificar**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

**Step 5: Commit**

```bash
git add src/client/pages/PrefectPage.tsx src/client/components/students
git commit -m "feat: add quick student profile panel for prefecture"
```

### Task 8: Cerrar integracion, pulir y verificar

**Files:**
- Review: `src/client/pages/StudentsPage.tsx`
- Review: `src/client/pages/PrefectPage.tsx`
- Review: `src/worker/routes/students.ts`
- Review: `src/worker/routes/documents.ts`

**Step 1: Revisar consistencia de textos y estados**

- UI completamente en español.
- Sin `alert` residuales en los flujos nuevos.

**Step 2: Verificar extremo a extremo**

Run: `npm run lint`
Expected: sin errores

Run: `npx tsc --noEmit`
Expected: sin errores

Run: `npm run build`
Expected: build exitoso

**Step 3: Commit final**

```bash
git add src/client/pages/StudentsPage.tsx src/client/pages/PrefectPage.tsx src/client/components/students src/worker/routes/students.ts src/worker/routes/documents.ts
git commit -m "feat: complete alumno 360 and prefect quick profile"
```

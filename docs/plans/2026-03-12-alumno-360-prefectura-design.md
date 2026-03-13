# Alumno 360 y Panel Rapido de Prefectura Design

**Objetivo:** Cerrar el dominio operativo del alumno con una ficha integral reutilizable y una vista rapida para prefectura que concentre foto, datos clave, tutores, documentos e incidencias.

**Decision principal:** Se implementara una sola fuente de verdad para el detalle del alumno. La pantalla de alumnos y el modulo de prefectura consumiran el mismo perfil consolidado para evitar duplicar consultas, estados y reglas de presentacion.

## Problema actual

El proyecto ya tiene base para alumnos, tutores, documentos e incidencias, pero cada parte esta incompleta o aislada:

- `Alumnos` solo cubre datos basicos y expediente digital parcial.
- `Guardians` existe en base de datos, pero no tiene CRUD completo en frontend.
- `Prefectura` registra incidencias, pero no ofrece contexto suficiente del alumno.
- `Documentos` sube y lista archivos, pero no existe una nocion clara de expediente completo ni de foto principal del alumno.

Esto obliga a navegar entre modulos para resolver una sola tarea operativa y deja sin cerrar el flujo de atencion rapida para prefectura.

## Enfoque recomendado

### 1. Perfil consolidado del alumno

Se agregara un endpoint de detalle enriquecido, por ejemplo `GET /api/students/:id/profile`, que regresara:

- datos generales del alumno;
- datos escolares;
- salud y contacto;
- tutores;
- documentos cargados;
- incidencias recientes;
- estatus de expediente.

La intencion es que frontend deje de componer esta informacion con multiples fetches dispersos.

### 2. Ficha 360 en modulo de alumnos

La pantalla de alumnos evolucionara de modal basico a ficha util de trabajo. La ficha tendra secciones claras:

- datos generales;
- datos escolares;
- salud y contacto;
- tutores;
- expediente digital;
- incidencias.

No se construira aun un modulo independiente de padres con login. Primero se cerrara su administracion dentro del contexto del alumno.

### 3. Panel rapido en prefectura

Prefectura tendra una vista lateral o panel contextual para consulta inmediata. Debe mostrar al menos:

- foto del alumno;
- nombre completo;
- matricula, grupo, semestre y carrera;
- tutor principal y telefonos;
- tipo de sangre y NSS;
- documentos principales;
- incidencias recientes.

Este panel debe poder abrirse tanto desde busqueda como desde un reporte ya existente.

### 4. Foto del alumno como activo principal

La fotografia dejara de ser solo un archivo mas del expediente. Cuando exista un documento tipo `photo`, el sistema lo usara como imagen principal del alumno, actualizando `students.photo_url` o derivando una URL consistente desde R2.

## Arquitectura

### Backend

- Extender `students` con endpoint de perfil consolidado.
- Agregar CRUD de tutores en rutas de alumnos o una subruta dedicada.
- Endurecer `documents` para soportar mejor expediente y foto principal.
- Corregir integracion de prefectura con la busqueda real de alumnos.
- Mantener permisos por rol para que admin, prefectura y docentes solo vean lo que corresponde.

### Frontend

- Crear un componente reutilizable para mostrar la ficha rapida del alumno.
- Integrar ese componente en `StudentsPage` y `PrefectPage`.
- Mejorar la edicion del alumno con secciones y estados de carga/error.
- Hacer visible el estatus del expediente mediante checklist y faltantes.

## Datos y reglas de negocio

- Un alumno puede tener varios tutores, pero debe existir un tutor principal visible.
- La foto principal del alumno debe salir del expediente y ser reutilizable por prefectura y credenciales.
- Documentos requeridos iniciales:
  - foto
  - acta de nacimiento
  - curp
  - certificado de secundaria
  - comprobante de domicilio
- El expediente debe poder distinguir entre `cargado`, `faltante` y despues, en una fase futura, `validado`.

## UX esperada

- En `Alumnos`, abrir una ficha debe sentirse como consultar un expediente real, no solo un formulario.
- En `Prefectura`, consultar a un alumno debe tomar segundos y no requerir cambiar de pantalla.
- Los estados vacios deben decir claramente que falta capturar.
- Los errores no deben depender de `alert`; deben mostrarse inline.

## Fases recomendadas

### Fase 1. Perfil y datos base

- endpoint consolidado del alumno;
- correccion de busqueda en prefectura;
- ficha rapida con datos basicos.

### Fase 2. Tutores

- CRUD completo de tutores dentro de alumno;
- visualizacion inmediata en prefectura.

### Fase 3. Expediente digital

- checklist de documentos;
- gestion de foto principal;
- acciones de ver y descargar.

### Fase 4. Incidencias integradas

- lista reciente en ficha del alumno;
- acceso rapido desde prefectura al historial del alumno.

## Criterios de exito

- La prefecta puede identificar y consultar rapidamente a un alumno con su contexto completo.
- Administracion puede editar tutores y expediente sin salir del modulo de alumnos.
- La fotografia y los documentos dejan de estar desconectados del resto del sistema.
- El mismo modelo de perfil sirve para futuros modulos como credenciales, portal familiar y tramites.

# Prefectura Bitacora Integral Design

**Objetivo:** Convertir el modulo de Prefectura en una consola operativa ligera pero trazable, donde cada accion relevante sobre un alumno quede registrada, pueda detonar comunicacion con tutor y sirva para corregir faltas de manera formal.

**Decision principal:** Se implementara una bitacora especializada de prefectura como fuente central de trazabilidad. Esta bitacora convivira con `attendance` y `conduct_reports`, pero concentrara la historia operativa del alumno sin depender de reconstrucciones fragiles entre tablas.

## Problema a resolver

Hoy Prefectura ya puede registrar incidencias y consultar un perfil rapido del alumno, pero aun faltan tres capacidades clave:

- registrar cualquier evento operativo relevante sobre el alumno en una sola linea de tiempo
- justificar faltas de forma formal desde Prefectura, reflejando el cambio para docentes
- generar mensajes sugeridos para tutor por WhatsApp sin automatizar el envio

La necesidad principal no es "meter mas formularios", sino tener un flujo trazable, rapido y entendible para operacion diaria.

## Alcance de la V1

La primera version de la bitacora integral cubrira:

- conducta
- falta justificada
- retardo
- salida anticipada
- citatorio
- contacto a tutor
- observacion libre

Tambien incluira una regla de negocio nueva:

- cuando Prefectura justifica una falta ya registrada, la asistencia afectada cambia a `justified`
- para el sistema, `justified` debe contarse igual que asistencia
- ademas se registra un evento formal que indique quien justifico, cuando y con que motivo

## Arquitectura recomendada

### 1. Bitacora especializada

Se agregara una tabla nueva, por ejemplo `prefecture_events`, con estructura orientada a auditoria:

- `id`
- `student_id`
- `event_type`
- `event_date`
- `summary`
- `details`
- `created_by`
- `related_attendance_id` opcional
- `related_conduct_id` opcional
- `guardian_id` opcional
- `whatsapp_message` opcional
- `whatsapp_opened_at` opcional
- `created_at`

Esto permite un timeline unico y consistente sin volver ambiguo el uso de `attendance` o `conduct_reports`.

### 2. Integracion con modulos existentes

- `attendance` sigue siendo la fuente oficial del estado de asistencia por clase
- `conduct_reports` sigue siendo la fuente oficial del reporte disciplinario
- `prefecture_events` se convierte en la fuente oficial de trazabilidad de Prefectura

Cuando una accion de Prefectura impacte otro modulo, se escribiran ambos cambios:

- actualizar el registro oficial correspondiente
- registrar el evento en bitacora

### 3. WhatsApp manual asistido

El sistema no enviara mensajes automaticamente. En su lugar:

- construira un mensaje sugerido a partir del evento
- abrira WhatsApp con el texto prellenado
- registrara que la prefecta abrio o intento abrir la comunicacion

Con esto se mantiene control humano y trazabilidad suficiente.

## Diseno de UI

La pantalla de Prefectura evolucionara hacia una consola de operacion diaria con tres zonas:

### Zona 1. Buscador y perfil rapido

Se mantiene el buscador de alumno y el panel lateral, pero el panel se expande para mostrar:

- ficha corta del alumno
- tutor principal y telefono
- resumen de incidencias
- timeline reciente de prefectura

### Zona 2. Acciones rapidas

Se agregara un bloque de accesos directos:

- Registrar conducta
- Justificar falta
- Registrar retardo
- Registrar salida
- Crear citatorio
- Agregar observacion
- Notificar tutor por WhatsApp

Cada accion debe abrir un formulario pequeno, optimizado para captura rapida.

### Zona 3. Timeline del alumno

Una linea de tiempo cronologica mostrara todos los eventos de Prefectura con:

- tipo de evento
- fecha y hora
- responsable
- resumen
- detalle expandible
- referencia a asistencia o conducta si aplica
- estado de notificacion si se genero mensaje

## Flujos operativos

### Justificar falta

1. Prefectura busca al alumno.
2. El sistema muestra faltas recientes susceptibles de justificacion.
3. Prefectura elige una o varias.
4. Captura motivo y fecha de justificacion.
5. El sistema cambia `attendance.status` a `justified`.
6. Registra evento `falta_justificada` en bitacora.
7. Ofrece boton para abrir WhatsApp con mensaje sugerido al tutor.

### Reporte de conducta

1. Prefectura selecciona alumno.
2. Captura tipo, descripcion y fecha.
3. El sistema guarda el reporte disciplinario.
4. Registra evento `conducta` en bitacora.
5. Ofrece mensaje sugerido para tutor.

### Contacto a tutor

1. Prefectura parte desde un evento o desde una accion libre.
2. El sistema construye el mensaje sugerido.
3. Se abre WhatsApp Web o enlace `wa.me`.
4. Se registra evento `contacto_tutor` o se marca `whatsapp_opened_at` en el evento relacionado.

### Observacion libre

1. Prefectura escribe una nota breve.
2. Se registra en timeline sin alterar asistencia o conducta.
3. Sirve para seguimiento informal y contexto futuro.

## Regla academica relevante

En esta fase se formaliza la interpretacion de asistencia:

- `present` cuenta como asistencia
- `justified` cuenta igual que asistencia
- `absent` y `late` se mantienen como estados diferenciados

Esto debe reflejarse en cualquier reporte, resumen o calculo que hoy trate `justified` como ausente.

## Riesgos y controles

### Riesgo 1. Duplicar datos sin criterio

Se evita guardando en `prefecture_events` solo trazabilidad y referencias, no copias completas de otros registros.

### Riesgo 2. UI demasiado pesada

Se controla limitando la V1 a formularios cortos y una timeline clara, sin reglas de aprobacion ni automatizaciones complejas.

### Riesgo 3. Confusion entre "abrio WhatsApp" y "mensaje enviado"

Se registrara solo intento o apertura de mensaje, no entrega confirmada.

## Resultado esperado

Prefectura tendra una experiencia mas operativa y menos fragmentada:

- una sola vista para entender que ha pasado con el alumno
- captura rapida de eventos
- justificaciones con impacto real en asistencia
- comunicacion con tutor asistida por el sistema
- trazabilidad clara para seguimiento escolar

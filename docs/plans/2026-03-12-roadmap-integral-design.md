# Roadmap Integral Sistema Escolar Design

**Objetivo:** Cerrar el Sistema Escolar CETMAR 42 con el mejor orden posible, priorizando primero la base tecnica y administrativa para despues acelerar la operacion diaria del plantel sin retrabajo.

**Decision principal:** El roadmap se organiza en dos grandes bloques. Primero se estabilizan los cimientos transversales del sistema: contratos de datos, autenticacion, autorizacion, vinculos entre cuentas y perfiles reales, validacion y herramientas de verificacion. Despues se completan y endurecen los modulos funcionales que ya existen en el repositorio.

## Estado real del proyecto

El proyecto ya no esta en etapa de "scaffold". Existen rutas y pantallas para asistencia, calificaciones, prefectura, credenciales, dashboard y tramites. El problema ya no es "crear modulos desde cero", sino completar flujos, corregir inconsistencias entre esquema y codigo, reforzar permisos y cerrar funcionalidades faltantes.

## Estrategia recomendada

### 1. Fundacion tecnica primero

La operacion diaria depende de que el sistema pueda identificar correctamente quien es docente, prefectura o administrador. Por eso la prioridad es:

- Alinear el esquema D1 con las rutas actuales.
- Corregir inconsistencias de nombres de columnas y campos.
- Cerrar RBAC y vinculos `users -> teachers/students`.
- Tener verificaciones reales de build y lint.

Sin esto, asistencia, vistas filtradas por usuario, bitacoras y tramites seguiran siendo fragiles.

### 2. Operacion diaria despues

Una vez establecida la base, el trabajo funcional se ordena por impacto operativo:

1. Asistencia
2. Calificaciones
3. Prefectura
4. Credenciales y control de acceso
5. Tramites y expediente digital
6. Dashboard y analitica

### 3. Cierre administrativo

Finalmente se cierran los modulos que habilitan sostenibilidad del sistema:

- Gestion de usuarios
- Vinculacion docente/alumno-cuenta
- Catalogos academicos
- Reglas de negocio y reportes finales

## Principios de ejecucion

- No duplicar modulos ya existentes; completar y endurecer los que ya estan.
- Cada fase debe dejar valor usable en produccion o en piloto.
- Las dependencias transversales se resuelven antes de seguir expandiendo UI.
- La verificacion debe basarse en comandos que hoy si puedan ejecutarse.

## Entregable derivado

Este diseno se refleja en la nueva version de `implementation_plan.md`, que pasa de un listado de ideas a un roadmap integral y ejecutable.

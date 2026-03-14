import test from "node:test";
import assert from "node:assert/strict";
import {
    buildPrefectureWhatsappMessage,
    buildWhatsappUrl,
    conductBehaviorCatalog,
    conductCategoryCatalog,
    getJustificationReasonLabel,
    getPrefectureEventLabel,
    justificationReasonCatalog,
    prefectureEventTypes,
    sortPrefectureTimeline,
} from "./prefecture.ts";

test("prefectureEventTypes expone los tipos iniciales permitidos", () => {
    assert.deepEqual(prefectureEventTypes, [
        "conducta",
        "falta_justificada",
        "retardo",
        "salida",
        "citatorio",
        "contacto_tutor",
        "observacion",
    ]);
});

test("sortPrefectureTimeline ordena por fecha del evento y luego por creacion descendente", () => {
    const sorted = sortPrefectureTimeline([
        { id: 1, event_date: "2026-03-12", created_at: "2026-03-12T08:00:00Z" },
        { id: 2, event_date: "2026-03-13", created_at: "2026-03-13T07:00:00Z" },
        { id: 3, event_date: "2026-03-13", created_at: "2026-03-13T09:00:00Z" },
    ]);

    assert.deepEqual(
        sorted.map((item) => item.id),
        [3, 2, 1],
    );
});

test("buildPrefectureWhatsappMessage genera un texto claro con alumno, grupo, fecha y resumen", () => {
    const message = buildPrefectureWhatsappMessage({
        eventType: "citatorio",
        studentName: "Luis Perez Lopez",
        guardianName: "Sra. Maria Lopez",
        groupName: "4 PIA A",
        eventDate: "2026-03-13",
        summary: "Se solicita presentarse en prefectura al inicio del turno.",
        details: "Motivo: seguimiento disciplinario.",
    });

    assert.match(message, /Luis Perez Lopez/);
    assert.match(message, /Sra\. Maria Lopez/);
    assert.match(message, /4 PIA A/);
    assert.match(message, /2026-03-13/);
    assert.match(message, /Citatorio/);
    assert.match(message, /Se solicita presentarse en prefectura al inicio del turno\./);
    assert.match(message, /seguimiento disciplinario/i);
});

test("getPrefectureEventLabel devuelve etiquetas legibles en espanol", () => {
    assert.equal(getPrefectureEventLabel("contacto_tutor"), "Contacto con tutor");
    assert.equal(getPrefectureEventLabel("retardo"), "Retardo");
});

test("expone catalogos predefinidos para conducta y justificaciones", () => {
    assert.ok(conductCategoryCatalog.some((item) => item.id === "uso_celular"));
    assert.ok(conductBehaviorCatalog.some((item) => item.id === "agresion_verbal"));
    assert.ok(justificationReasonCatalog.some((item) => item.id === "cita_medica"));
    assert.equal(getJustificationReasonLabel("error_captura"), "Error de captura");
});

test("buildWhatsappUrl sanitiza el telefono y codifica el mensaje", () => {
    const url = buildWhatsappUrl("+52 664-123-4567", "Hola tutor");

    assert.equal(url, "https://wa.me/526641234567?text=Hola%20tutor");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
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

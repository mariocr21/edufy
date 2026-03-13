import { CheckCircle2, CircleAlert } from "lucide-react";
import type { StudentChecklistItem } from "./types";

const checklistLabels: Record<string, string> = {
    photo: "Fotografia",
    acta_nacimiento: "Acta de nacimiento",
    curp: "CURP",
    certificado_secundaria: "Certificado de secundaria",
    comprobante_domicilio: "Comprobante de domicilio",
};

export function StudentProfileChecklist({ items }: { items: StudentChecklistItem[] }) {
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => {
                const complete = item.status === "uploaded";

                return (
                    <div
                        key={item.document_type}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                            complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                    >
                        <div className="flex items-center gap-2 font-medium">
                            {complete ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                            {checklistLabels[item.document_type] ?? item.document_type}
                        </div>
                        <p className="mt-1 text-xs">
                            {complete ? "Documento cargado" : "Pendiente por cargar"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

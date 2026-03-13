import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { studentsRoutes } from "./routes/students";
import { teachersRoutes } from "./routes/teachers";
import { importRoutes } from "./routes/import";
import { catalogsRoutes } from "./routes/catalogs";
import { attendanceRoutes } from "./routes/attendance";
import { gradesRoutes } from "./routes/grades";
import { conductRoutes } from "./routes/conduct";
import { credentialsRoutes } from "./routes/credentials";
import { dashboardRoutes } from "./routes/dashboard";
import { documentsRoutes } from "./routes/documents";
import { usersRoutes } from "./routes/users";
import type { Bindings } from "./bindings";

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use("/api/*", cors());

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/students", studentsRoutes);
app.route("/api/teachers", teachersRoutes);
app.route("/api/import", importRoutes);
app.route("/api/catalogs", catalogsRoutes);
app.route("/api/attendance", attendanceRoutes);
app.route("/api/grades", gradesRoutes);
app.route("/api/conduct", conductRoutes);
app.route("/api/credentials", credentialsRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/documents", documentsRoutes);
app.route("/api/users", usersRoutes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.notFound(async (c) => {
    const url = new URL(c.req.url);

    if (url.pathname.startsWith("/api/")) {
        return c.json({ success: false, error: "Ruta no encontrada" }, 404);
    }

    const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
        return assetResponse;
    }

    url.pathname = "/index.html";
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

export default app;


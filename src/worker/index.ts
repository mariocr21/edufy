import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { studentsRoutes } from "./routes/students";
import { teachersRoutes } from "./routes/teachers";
import { importRoutes } from "./routes/import";
import { catalogsRoutes } from "./routes/catalogs";
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

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

export default app;


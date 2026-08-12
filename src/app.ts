import express, { Express } from "express";
import { buildCarbonRoutes } from "./routes/carbonRoutes";

/**
 * Fábrica de la aplicación Express. Separarla de server.ts permite
 * importarla directamente en las pruebas de integración (con Supertest)
 * sin necesidad de levantar un puerto real.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api", buildCarbonRoutes());

  return app;
}

import path from "path";
import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { buildCarbonRoutes } from "./routes/carbonRoutes";
import { CarbonController } from "./controllers/carbonController";
import { CarbonCalculator } from "./domain/CarbonCalculator";
import { ConfigFileEmissionFactorProvider } from "./domain/ConfigFileEmissionFactorProvider";

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

  // Los factores de emisión se cargan desde config/emission-factors.json
  // (o la ruta que indique EMISSION_FACTORS_PATH), no están hardcodeados.
  // Si el archivo no está disponible, ConfigFileEmissionFactorProvider cae
  // de vuelta a los valores estáticos por defecto.
  const calculator = new CarbonCalculator(new ConfigFileEmissionFactorProvider());
  const controller = new CarbonController(calculator);
  app.use("/api", buildCarbonRoutes(controller));

  // Documentación interactiva de la API (OpenAPI/Swagger) en /docs.
  const openapiPath = path.join(__dirname, "..", "openapi.yaml");
  const openapiDocument = YAML.load(openapiPath);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

  return app;
}

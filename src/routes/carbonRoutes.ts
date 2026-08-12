import { Router } from "express";
import { CarbonController } from "../controllers/carbonController";

export function buildCarbonRoutes(
  controller: CarbonController = new CarbonController()
): Router {
  const router = Router();

  // POST /api/carbon/calculate
  // Body: { vehicleType, cargoWeightTons, distanceKm, efficiencyFactor? }
  router.post("/carbon/calculate", controller.calculateEmissions);

  return router;
}

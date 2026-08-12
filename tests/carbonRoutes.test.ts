import request from "supertest";
import express from "express";
import { buildCarbonRoutes } from "../src/routes/carbonRoutes";

describe("buildCarbonRoutes", () => {
  it("usa un CarbonController por defecto si no se inyecta uno", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", buildCarbonRoutes());

    const response = await request(app).post("/api/carbon/calculate").send({
      vehicleType: "diesel",
      cargoWeightTons: 10,
      distanceKm: 100,
    });

    expect(response.status).toBe(200);
    expect(response.body.co2EmissionsKg).toBeCloseTo(162, 4);
  });
});

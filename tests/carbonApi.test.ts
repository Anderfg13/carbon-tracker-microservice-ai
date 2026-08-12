import request from "supertest";
import { createApp } from "../src/app";
import { VehicleType } from "../src/domain/VehicleType";

const app = createApp();

describe("POST /api/carbon/calculate", () => {
  it("devuelve 200 y el cálculo correcto para una solicitud válida", async () => {
    const response = await request(app).post("/api/carbon/calculate").send({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 10,
      distanceKm: 100,
    });

    expect(response.status).toBe(200);
    expect(response.body.co2EmissionsKg).toBeCloseTo(162, 4);
  });

  it("devuelve 400 cuando la distancia es cero", async () => {
    const response = await request(app).post("/api/carbon/calculate").send({
      vehicleType: VehicleType.DIESEL,
      cargoWeightTons: 10,
      distanceKm: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/distancia/i);
  });

  it("devuelve 400 cuando el tipo de vehículo no es soportado", async () => {
    const response = await request(app).post("/api/carbon/calculate").send({
      vehicleType: "gasoline",
      cargoWeightTons: 10,
      distanceKm: 100,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Tipo de vehículo no soportado/);
  });

  it("devuelve 400 cuando el cuerpo de la solicitud está vacío", async () => {
    const response = await request(app).post("/api/carbon/calculate").send({});

    expect(response.status).toBe(400);
  });
});

describe("GET /health", () => {
  it("devuelve 200 y estado ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("GET /docs", () => {
  it("expone la documentación interactiva de Swagger", async () => {
    const response = await request(app).get("/docs/").redirects(1);
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/swagger/i);
  });
});

import { Request, Response } from "express";
import { CarbonController } from "../src/controllers/carbonController";
import { CarbonCalculator } from "../src/domain/CarbonCalculator";

function buildMockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("CarbonController", () => {
  it("usa un CarbonCalculator por defecto si no se inyecta uno", () => {
    const controller = new CarbonController();
    expect(controller).toBeInstanceOf(CarbonController);
  });

  it("devuelve 500 y no expone detalles internos si el cálculo lanza un error inesperado", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const failingCalculator = {
      calculate: jest.fn().mockImplementation(() => {
        throw new Error("fallo interno inesperado, ej. de infraestructura");
      }),
    } as unknown as CarbonCalculator;

    const controller = new CarbonController(failingCalculator);
    const req = { body: { vehicleType: "diesel", cargoWeightTons: 10, distanceKm: 100 } } as Request;
    const res = buildMockResponse();

    controller.calculateEmissions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error interno del servidor." });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

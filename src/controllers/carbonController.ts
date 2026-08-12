import { Request, Response } from "express";
import { CarbonCalculator } from "../domain/CarbonCalculator";
import { InvalidCarbonInputError } from "../domain/errors";

/**
 * Capa de controlador: traduce HTTP <-> dominio. No contiene lógica de
 * negocio (Separación de Responsabilidades) — delega todo el cálculo y la
 * validación de reglas de negocio al CarbonCalculator.
 */
export class CarbonController {
  constructor(private readonly calculator: CarbonCalculator = new CarbonCalculator()) {}

  calculateEmissions = (req: Request, res: Response): void => {
    try {
      const { vehicleType, cargoWeightTons, distanceKm, efficiencyFactor } = req.body ?? {};

      const result = this.calculator.calculate({
        vehicleType,
        cargoWeightTons,
        distanceKm,
        efficiencyFactor,
      });

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCarbonInputError) {
        res.status(400).json({ error: error.message });
        return;
      }

      // Error inesperado: no exponemos detalles internos al cliente.
      // eslint-disable-next-line no-console
      console.error("Error inesperado calculando emisiones:", error);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  };
}

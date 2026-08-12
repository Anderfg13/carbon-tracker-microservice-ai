import { VehicleType, isValidVehicleType } from "./VehicleType";
import {
  EmissionFactorProvider,
  StaticEmissionFactorProvider,
} from "./EmissionFactorProvider";
import { InvalidCarbonInputError } from "./errors";

export interface CarbonCalculationInput {
  vehicleType: VehicleType;
  cargoWeightTons: number;
  distanceKm: number;
  /**
   * Multiplicador de eficiencia del vehículo respecto a la línea base
   * (1.0 = eficiencia estándar). Valores < 1 representan un vehículo más
   * eficiente que el promedio; valores > 1, uno menos eficiente. Opcional,
   * por defecto 1.0.
   */
  efficiencyFactor?: number;
}

export interface CarbonCalculationResult {
  vehicleType: VehicleType;
  cargoWeightTons: number;
  distanceKm: number;
  efficiencyFactor: number;
  emissionFactorUsed: number;
  co2EmissionsKg: number;
}

const DEFAULT_EFFICIENCY_FACTOR = 1.0;

/**
 * Servicio de dominio: calcula las emisiones de CO2 de un trayecto de carga.
 *
 * Principio de Responsabilidad Única (SOLID): esta clase solo sabe calcular
 * emisiones, no conoce HTTP, Express ni el formato de la API.
 *
 * Principio de Inversión de Dependencias (SOLID): recibe un
 * EmissionFactorProvider por constructor en vez de leer la tabla de
 * factores directamente, lo que facilita las pruebas y la extensión futura.
 */
export class CarbonCalculator {
  constructor(
    private readonly factorProvider: EmissionFactorProvider = new StaticEmissionFactorProvider()
  ) {}

  calculate(input: CarbonCalculationInput): CarbonCalculationResult {
    this.validate(input);

    const efficiencyFactor = input.efficiencyFactor ?? DEFAULT_EFFICIENCY_FACTOR;
    const emissionFactorUsed = this.factorProvider.getFactor(input.vehicleType);

    // kg CO2 = distancia (km) x carga (t) x factor de emisión (kg CO2/t·km) x eficiencia
    const rawEmissions =
      input.distanceKm * input.cargoWeightTons * emissionFactorUsed * efficiencyFactor;

    return {
      vehicleType: input.vehicleType,
      cargoWeightTons: input.cargoWeightTons,
      distanceKm: input.distanceKm,
      efficiencyFactor,
      emissionFactorUsed,
      co2EmissionsKg: Number(rawEmissions.toFixed(4)),
    };
  }

  private validate(input: CarbonCalculationInput): void {
    if (input === null || typeof input !== "object") {
      throw new InvalidCarbonInputError("El cuerpo de la solicitud es inválido.");
    }

    if (!isValidVehicleType(input.vehicleType)) {
      throw new InvalidCarbonInputError(
        `Tipo de vehículo no soportado: ${String(input.vehicleType)}. Valores válidos: ${Object.values(
          VehicleType
        ).join(", ")}.`
      );
    }

    if (
      typeof input.distanceKm !== "number" ||
      Number.isNaN(input.distanceKm) ||
      input.distanceKm <= 0
    ) {
      throw new InvalidCarbonInputError(
        "La distancia recorrida (distanceKm) debe ser un número mayor a 0."
      );
    }

    if (
      typeof input.cargoWeightTons !== "number" ||
      Number.isNaN(input.cargoWeightTons) ||
      input.cargoWeightTons < 0
    ) {
      throw new InvalidCarbonInputError(
        "El peso de la carga (cargoWeightTons) no puede ser negativo."
      );
    }

    if (
      input.efficiencyFactor !== undefined &&
      (typeof input.efficiencyFactor !== "number" ||
        Number.isNaN(input.efficiencyFactor) ||
        input.efficiencyFactor <= 0)
    ) {
      throw new InvalidCarbonInputError(
        "El factor de eficiencia (efficiencyFactor) debe ser un número mayor a 0."
      );
    }
  }
}

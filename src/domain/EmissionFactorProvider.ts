import { VehicleType } from "./VehicleType";
import { EMISSION_FACTORS } from "./EmissionFactors";
import { InvalidCarbonInputError } from "./errors";

/**
 * Puerto (interfaz) para obtener el factor de emisión de un vehículo.
 * Aislar esto detrás de una interfaz permite:
 *  - Cumplir el Principio de Inversión de Dependencias (SOLID): el
 *    CarbonCalculator depende de una abstracción, no de una tabla fija.
 *  - Sustituir la fuente de datos en el futuro (ej. una base de datos o un
 *    servicio externo de factores de emisión) sin tocar la lógica de cálculo.
 *  - Facilitar pruebas unitarias con un proveedor "falso" (test double).
 */
export interface EmissionFactorProvider {
  getFactor(vehicleType: VehicleType): number;
}

export class StaticEmissionFactorProvider implements EmissionFactorProvider {
  getFactor(vehicleType: VehicleType): number {
    const factor = EMISSION_FACTORS[vehicleType];
    if (factor === undefined) {
      throw new InvalidCarbonInputError(
        `Tipo de vehículo no soportado: ${vehicleType}`
      );
    }
    return factor;
  }
}

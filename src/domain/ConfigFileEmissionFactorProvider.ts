import fs from "fs";
import path from "path";
import { VehicleType, isValidVehicleType } from "./VehicleType";
import { EmissionFactorProvider } from "./EmissionFactorProvider";
import { EMISSION_FACTORS as DEFAULT_EMISSION_FACTORS } from "./EmissionFactors";
import { InvalidCarbonInputError } from "./errors";

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), "config", "emission-factors.json");

/**
 * Proveedor de factores de emisión que los lee desde un archivo de
 * configuración externo (JSON) en vez de tenerlos hardcodeados en el
 * código fuente.
 *
 * Motivación (feedback de revisión): permite actualizar los factores de
 * emisión —por ejemplo cuando cambian los estándares de la industria o se
 * agregan nuevos tipos de vehículo— reemplazando un archivo de
 * configuración (o apuntando EMISSION_FACTORS_PATH a otra ruta), sin
 * modificar ni redeployar el código de la aplicación.
 *
 * Si el archivo no existe o está mal formado, no rompe el arranque del
 * servicio: cae de vuelta a los valores estáticos por defecto de
 * EmissionFactors.ts y registra una advertencia.
 */
export class ConfigFileEmissionFactorProvider implements EmissionFactorProvider {
  private readonly factors: Record<string, number>;

  constructor(configPath: string = process.env.EMISSION_FACTORS_PATH ?? DEFAULT_CONFIG_PATH) {
    this.factors = this.loadFactors(configPath);
  }

  getFactor(vehicleType: VehicleType): number {
    if (!isValidVehicleType(vehicleType)) {
      throw new InvalidCarbonInputError(`Tipo de vehículo no soportado: ${vehicleType}`);
    }

    const factor = this.factors[vehicleType];
    if (factor === undefined) {
      throw new InvalidCarbonInputError(
        `No hay factor de emisión configurado para el tipo de vehículo: ${vehicleType}`
      );
    }
    return factor;
  }

  private loadFactors(configPath: string): Record<string, number> {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      this.assertValidShape(parsed);
      return parsed;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `[ConfigFileEmissionFactorProvider] No se pudo cargar "${configPath}" ` +
          `(${(error as Error).message}). Usando factores de emisión por defecto.`
      );
      return DEFAULT_EMISSION_FACTORS;
    }
  }

  private assertValidShape(value: unknown): asserts value is Record<string, number> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("el archivo de configuración debe contener un objeto JSON plano");
    }
    for (const [key, factor] of Object.entries(value as Record<string, unknown>)) {
      if (typeof factor !== "number" || Number.isNaN(factor) || factor < 0) {
        throw new Error(`el factor de emisión para "${key}" debe ser un número >= 0`);
      }
    }
  }
}

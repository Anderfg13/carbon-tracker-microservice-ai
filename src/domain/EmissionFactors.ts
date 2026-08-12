import { VehicleType } from "./VehicleType";

/**
 * Factores de emisión base, en kg de CO2 emitidos por tonelada-kilómetro
 * (kg CO2 / t·km). Son valores de referencia de la industria de transporte
 * de carga y sirven como línea base antes de aplicar el factor de
 * eficiencia particular del vehículo.
 *
 * Fuente conceptual: promedios típicos reportados por guías de factores de
 * emisión de transporte de carga (ej. GLEC Framework / GHG Protocol).
 * Ajustar estos valores no requiere tocar la lógica de cálculo (Open/Closed).
 */
export const EMISSION_FACTORS: Record<VehicleType, number> = {
  [VehicleType.DIESEL]: 0.162,
  [VehicleType.HYBRID]: 0.09,
  [VehicleType.ELECTRIC]: 0.03,
};

/**
 * Tipos de vehículo soportados por el servicio de cálculo de huella de carbono.
 * Mantenido como enum para que TypeScript valide en tiempo de compilación
 * cualquier lugar del código que dependa de un tipo de vehículo.
 */
export enum VehicleType {
  ELECTRIC = "electric",
  DIESEL = "diesel",
  HYBRID = "hybrid",
}

export function isValidVehicleType(value: unknown): value is VehicleType {
  return (
    typeof value === "string" &&
    (Object.values(VehicleType) as string[]).includes(value)
  );
}

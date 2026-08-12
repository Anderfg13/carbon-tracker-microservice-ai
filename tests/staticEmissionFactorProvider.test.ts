import { StaticEmissionFactorProvider } from "../src/domain/EmissionFactorProvider";
import { VehicleType } from "../src/domain/VehicleType";
import { InvalidCarbonInputError } from "../src/domain/errors";

describe("StaticEmissionFactorProvider", () => {
  it("devuelve el factor de emisión correcto para cada tipo de vehículo soportado", () => {
    const provider = new StaticEmissionFactorProvider();

    expect(provider.getFactor(VehicleType.DIESEL)).toBe(0.162);
    expect(provider.getFactor(VehicleType.HYBRID)).toBe(0.09);
    expect(provider.getFactor(VehicleType.ELECTRIC)).toBe(0.03);
  });

  it("lanza InvalidCarbonInputError si el tipo de vehículo no tiene factor definido", () => {
    const provider = new StaticEmissionFactorProvider();

    expect(() =>
      // @ts-expect-error: probamos un valor fuera del enum a propósito
      provider.getFactor("gasoline")
    ).toThrow(InvalidCarbonInputError);
  });
});

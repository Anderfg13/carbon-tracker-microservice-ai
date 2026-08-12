import fs from "fs";
import path from "path";
import os from "os";
import { ConfigFileEmissionFactorProvider } from "../src/domain/ConfigFileEmissionFactorProvider";
import { VehicleType } from "../src/domain/VehicleType";
import { InvalidCarbonInputError } from "../src/domain/errors";
import { EMISSION_FACTORS } from "../src/domain/EmissionFactors";

function writeTempConfig(content: string): string {
  const filePath = path.join(os.tmpdir(), `emission-factors-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

describe("ConfigFileEmissionFactorProvider", () => {
  it("lee los factores de emisión desde un archivo JSON válido", () => {
    const configPath = writeTempConfig(
      JSON.stringify({ diesel: 0.2, hybrid: 0.1, electric: 0.05 })
    );

    const provider = new ConfigFileEmissionFactorProvider(configPath);

    expect(provider.getFactor(VehicleType.DIESEL)).toBe(0.2);
    expect(provider.getFactor(VehicleType.HYBRID)).toBe(0.1);
    expect(provider.getFactor(VehicleType.ELECTRIC)).toBe(0.05);
  });

  it("usa los valores por defecto si el archivo no existe", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const provider = new ConfigFileEmissionFactorProvider("/ruta/que/no/existe.json");

    expect(provider.getFactor(VehicleType.DIESEL)).toBe(EMISSION_FACTORS[VehicleType.DIESEL]);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("usa los valores por defecto si el archivo tiene JSON mal formado", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const configPath = writeTempConfig("{ esto no es json valido");

    const provider = new ConfigFileEmissionFactorProvider(configPath);

    expect(provider.getFactor(VehicleType.ELECTRIC)).toBe(EMISSION_FACTORS[VehicleType.ELECTRIC]);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("usa los valores por defecto si algún factor no es numérico", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const configPath = writeTempConfig(JSON.stringify({ diesel: "no-es-numero" }));

    const provider = new ConfigFileEmissionFactorProvider(configPath);

    expect(provider.getFactor(VehicleType.DIESEL)).toBe(EMISSION_FACTORS[VehicleType.DIESEL]);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("lanza InvalidCarbonInputError si el tipo de vehículo no está en la config", () => {
    const configPath = writeTempConfig(JSON.stringify({ diesel: 0.162 }));
    const provider = new ConfigFileEmissionFactorProvider(configPath);

    expect(() => provider.getFactor(VehicleType.ELECTRIC)).toThrow(InvalidCarbonInputError);
  });
});

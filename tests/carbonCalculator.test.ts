import { CarbonCalculator } from "../src/domain/CarbonCalculator";
import { VehicleType } from "../src/domain/VehicleType";
import { InvalidCarbonInputError } from "../src/domain/errors";
import { EmissionFactorProvider } from "../src/domain/EmissionFactorProvider";

describe("CarbonCalculator", () => {
  let calculator: CarbonCalculator;

  beforeEach(() => {
    calculator = new CarbonCalculator();
  });

  describe("cálculos válidos", () => {
    it("calcula las emisiones de un vehículo diésel con eficiencia estándar", () => {
      const result = calculator.calculate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 10,
        distanceKm: 100,
      });

      // 100 km * 10 t * 0.162 kgCO2/t·km * 1.0 = 162 kg
      expect(result.co2EmissionsKg).toBeCloseTo(162, 4);
      expect(result.efficiencyFactor).toBe(1.0);
      expect(result.emissionFactorUsed).toBe(0.162);
    });

    it("calcula las emisiones de un vehículo eléctrico", () => {
      const result = calculator.calculate({
        vehicleType: VehicleType.ELECTRIC,
        cargoWeightTons: 5,
        distanceKm: 50,
      });

      // 50 km * 5 t * 0.03 kgCO2/t·km = 7.5 kg
      expect(result.co2EmissionsKg).toBeCloseTo(7.5, 4);
    });

    it("calcula las emisiones de un vehículo híbrido", () => {
      const result = calculator.calculate({
        vehicleType: VehicleType.HYBRID,
        cargoWeightTons: 8,
        distanceKm: 200,
      });

      // 200 km * 8 t * 0.09 kgCO2/t·km = 144 kg
      expect(result.co2EmissionsKg).toBeCloseTo(144, 4);
    });

    it("aplica un factor de eficiencia personalizado", () => {
      const result = calculator.calculate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 10,
        distanceKm: 100,
        efficiencyFactor: 0.8, // vehículo 20% más eficiente que el promedio
      });

      // 162 kg (línea base) * 0.8 = 129.6 kg
      expect(result.co2EmissionsKg).toBeCloseTo(129.6, 4);
    });

    it("permite carga de peso cero (vehículo vacío / retorno en vacío)", () => {
      const result = calculator.calculate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 0,
        distanceKm: 100,
      });

      expect(result.co2EmissionsKg).toBe(0);
    });
  });

  describe("casos de borde e inválidos", () => {
    it("rechaza distancia igual a cero", () => {
      expect(() =>
        calculator.calculate({
          vehicleType: VehicleType.DIESEL,
          cargoWeightTons: 10,
          distanceKm: 0,
        })
      ).toThrow(InvalidCarbonInputError);
    });

    it("rechaza distancia negativa", () => {
      expect(() =>
        calculator.calculate({
          vehicleType: VehicleType.DIESEL,
          cargoWeightTons: 10,
          distanceKm: -50,
        })
      ).toThrow(InvalidCarbonInputError);
    });

    it("rechaza peso de carga negativo", () => {
      expect(() =>
        calculator.calculate({
          vehicleType: VehicleType.DIESEL,
          cargoWeightTons: -1,
          distanceKm: 100,
        })
      ).toThrow(/no puede ser negativo/);
    });

    it("rechaza un tipo de vehículo no soportado", () => {
      expect(() =>
        calculator.calculate({
          // @ts-expect-error: probamos un valor inválido a propósito
          vehicleType: "gasoline",
          cargoWeightTons: 10,
          distanceKm: 100,
        })
      ).toThrow(/Tipo de vehículo no soportado/);
    });

    it("rechaza un factor de eficiencia igual a cero", () => {
      expect(() =>
        calculator.calculate({
          vehicleType: VehicleType.DIESEL,
          cargoWeightTons: 10,
          distanceKm: 100,
          efficiencyFactor: 0,
        })
      ).toThrow(InvalidCarbonInputError);
    });

    it("rechaza un factor de eficiencia negativo", () => {
      expect(() =>
        calculator.calculate({
          vehicleType: VehicleType.DIESEL,
          cargoWeightTons: 10,
          distanceKm: 100,
          efficiencyFactor: -0.5,
        })
      ).toThrow(InvalidCarbonInputError);
    });

    it("rechaza distanceKm que no es un número (NaN)", () => {
      expect(() =>
        calculator.calculate({
          vehicleType: VehicleType.DIESEL,
          cargoWeightTons: 10,
          // @ts-expect-error: probamos un valor inválido a propósito
          distanceKm: "cien",
        })
      ).toThrow(InvalidCarbonInputError);
    });
  });

  describe("inyección de dependencias (EmissionFactorProvider)", () => {
    it("usa un proveedor de factores personalizado (test double)", () => {
      const fakeProvider: EmissionFactorProvider = {
        getFactor: jest.fn().mockReturnValue(1), // factor fijo = 1 para simplificar el cálculo
      };
      const customCalculator = new CarbonCalculator(fakeProvider);

      const result = customCalculator.calculate({
        vehicleType: VehicleType.DIESEL,
        cargoWeightTons: 10,
        distanceKm: 10,
      });

      expect(fakeProvider.getFactor).toHaveBeenCalledWith(VehicleType.DIESEL);
      expect(result.co2EmissionsKg).toBe(100); // 10 * 10 * 1 * 1
    });
  });
});

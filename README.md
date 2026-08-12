# Carbon Tracker Microservice — EcoLogistics

Microservicio que calcula las emisiones de CO2 de un trayecto de carga, a
partir del tipo de vehículo (eléctrico, diésel, híbrido), el peso de la
carga y la distancia recorrida.

## Stack

Node.js + TypeScript + Express · Jest + Supertest para pruebas.

## Estructura del proyecto

```
src/
  domain/
    VehicleType.ts             enum de tipos de vehículo soportados
    EmissionFactors.ts         tabla de factores de emisión (kg CO2 / t·km)
    EmissionFactorProvider.ts  interfaz + implementación (inyección de dependencias)
    CarbonCalculator.ts        lógica de negocio: validación + cálculo
    errors.ts                  error de dominio InvalidCarbonInputError
  controllers/
    carbonController.ts        traduce HTTP <-> dominio
  routes/
    carbonRoutes.ts            definición de rutas Express
  app.ts                       fábrica de la app Express (usada también en tests)
  server.ts                    arranque del servidor HTTP
tests/
  carbonCalculator.test.ts     pruebas unitarias de la lógica de negocio
  carbonApi.test.ts            pruebas de integración de la API (Supertest)
docs/
  bitacora-prompts.md          registro de prompts usados durante el desarrollo
```

## Fórmula de cálculo

```
CO2 (kg) = distancia_km × carga_toneladas × factor_emisión(vehículo) × factor_eficiencia
```

Factores de emisión base (kg CO2 / tonelada-km):

| Vehículo  | Factor |
|-----------|--------|
| Diésel    | 0.162  |
| Híbrido   | 0.090  |
| Eléctrico | 0.030  |

`factor_eficiencia` es opcional (por defecto `1.0`) y permite ajustar el
cálculo según qué tan eficiente es un vehículo particular respecto al
promedio de su categoría.

## Cómo correr el proyecto

```bash
npm install
npm run dev      # servidor en modo desarrollo (ts-node-dev)
npm run build    # compila a dist/
npm start        # corre la versión compilada
npm test         # ejecuta la suite de pruebas con cobertura
```

## API

### `POST /api/carbon/calculate`

Body:

```json
{
  "vehicleType": "diesel",
  "cargoWeightTons": 10,
  "distanceKm": 100,
  "efficiencyFactor": 1.0
}
```

`vehicleType` acepta `"electric"`, `"diesel"` o `"hybrid"`. `efficiencyFactor`
es opcional.

Respuesta 200:

```json
{
  "vehicleType": "diesel",
  "cargoWeightTons": 10,
  "distanceKm": 100,
  "efficiencyFactor": 1,
  "emissionFactorUsed": 0.162,
  "co2EmissionsKg": 162
}
```

Respuesta 400 (dato inválido, ej. `distanceKm: 0`):

```json
{ "error": "La distancia recorrida (distanceKm) debe ser un número mayor a 0." }
```

### `GET /health`

Verificación de disponibilidad del servicio.

## Pruebas

```
Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
Cobertura:   94.2% statements / 90% branches / 100% functions / 94.2% lines
```

Casos de borde cubiertos: distancia cero y negativa, carga negativa (carga
cero se acepta como válida), tipo de vehículo no soportado, factor de
eficiencia cero y negativo, y entrada con tipo incorrecto (string en vez de
number).

## Reflexión crítica: ventajas y riesgos de usar un LLM en este proceso

Usar un LLM como pair programmer en este proyecto aceleró notablemente las
fases de diseño y pruebas: forzar al modelo a razonar la fórmula y los casos
de borde antes de escribir código (Chain-of-Thought) produjo un diseño de
validación casi completo desde el primer intento, y pedir la suite de
pruebas listando explícitamente los escenarios a cubrir garantizó que no se
quedara ningún caso de borde fuera — algo que, hecho manualmente, es fácil
de omitir bajo presión de tiempo. La separación en capas (domain /
controllers / routes) también salió más limpia al pedírsela explícitamente
como restricción de diseño desde el inicio, en vez de refactorizarla después.

El riesgo principal es la confianza ciega: el LLM propuso valores de
factores de emisión (0.162, 0.09, 0.03 kg CO2/t·km) que son razonables como
aproximación de industria, pero un ingeniero debe verificarlos contra una
fuente autorizada (ej. GLEC Framework, GHG Protocol) antes de usarlos en un
sistema real de reporte de sostenibilidad — aceptar cifras generadas sin
citar su origen puede introducir errores silenciosos en un dominio donde la
precisión regulatoria importa. Igualmente, el primer borrador de validación
del LLM tenía un bug real (comparación numérica sin verificar el tipo de
`distanceKm`), que solo se detectó porque se revisó el código con
intención crítica en vez de aceptarlo tal cual. En resumen: el LLM es muy
efectivo para acelerar diseño, cobertura de pruebas y refactorización
guiada, pero la responsabilidad de validar la corrección del dominio (las
fórmulas, los datos de referencia, los bugs sutiles de tipado) sigue siendo
del ingeniero.

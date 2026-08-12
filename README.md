# Carbon Tracker Microservice — EcoLogistics

Microservicio que calcula las emisiones de CO2 de un trayecto de carga, a
partir del tipo de vehículo (eléctrico, diésel, híbrido), el peso de la
carga y la distancia recorrida.

## Stack

Node.js + TypeScript + Express · Jest + Supertest para pruebas · Docker para despliegue.

## Estructura del proyecto

```
src/
  domain/
    VehicleType.ts                     enum de tipos de vehículo soportados
    EmissionFactors.ts                 factores de emisión por defecto (fallback)
    EmissionFactorProvider.ts          interfaz + implementación estática (inyección de dependencias)
    ConfigFileEmissionFactorProvider.ts implementación que lee los factores desde config/ (o env var)
    CarbonCalculator.ts                lógica de negocio: validación + cálculo
    errors.ts                          error de dominio InvalidCarbonInputError
  controllers/
    carbonController.ts        traduce HTTP <-> dominio
  routes/
    carbonRoutes.ts            definición de rutas Express
  app.ts                       fábrica de la app Express (usada también en tests); expone /docs
  server.ts                    arranque del servidor HTTP
tests/
  carbonCalculator.test.ts               pruebas unitarias de la lógica de negocio
  carbonController.test.ts               pruebas unitarias del controlador (incluye rama 500)
  carbonRoutes.test.ts                   prueba del wiring por defecto de las rutas
  staticEmissionFactorProvider.test.ts   pruebas del proveedor estático
  configFileEmissionFactorProvider.test.ts pruebas del proveedor basado en config
  carbonApi.test.ts                      pruebas de integración de la API (Supertest)
docs/
  bitacora-prompts.md          registro de prompts usados durante el desarrollo
config/
  emission-factors.json        factores de emisión externalizados (editables sin redeploy)
openapi.yaml                   especificación OpenAPI 3.0 de la API, servida en /docs
Dockerfile, docker-compose.yml, scripts/test-docker.sh   empaquetado y prueba de integración en contenedor
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

### `GET /docs`

Documentación interactiva de la API (Swagger UI), generada a partir de
`openapi.yaml`. Permite explorar los endpoints y probarlos directamente
desde el navegador sin necesidad de Postman/curl.

## Configuración externa de factores de emisión

Los factores de emisión ya no están hardcodeados en el código: se leen de
`config/emission-factors.json` en tiempo de arranque, a través de
`ConfigFileEmissionFactorProvider`.

```json
{
  "diesel": 0.162,
  "hybrid": 0.09,
  "electric": 0.03
}
```

Para actualizar un factor (por ejemplo, cuando cambien los estándares de la
industria) basta con editar ese archivo — no requiere tocar ni redeployar
el código de la aplicación. También se puede apuntar a otra ubicación con
la variable de entorno `EMISSION_FACTORS_PATH` (útil en Docker/producción).
Si el archivo no existe o está mal formado, el servicio no falla: cae de
vuelta a los valores estáticos por defecto (`EmissionFactors.ts`) y deja un
`console.warn` para diagnosticarlo.

## Docker

```bash
docker compose up --build
# o manualmente:
docker build -t carbon-tracker-microservice .
docker run -p 3000:3000 carbon-tracker-microservice
```

El `Dockerfile` usa build multi-stage (compila TypeScript en una etapa,
corre solo el `dist/` compilado + dependencias de producción en la otra) e
incluye un `HEALTHCHECK` sobre `/health`.

### Prueba de integración a nivel Docker

```bash
npm run docker:test
```

`scripts/test-docker.sh` construye la imagen, levanta un contenedor real,
espera a que `/health` responda, y valida tanto un cálculo correcto
(`POST /api/carbon/calculate`) como el caso de validación fallida (400),
todo contra el contenedor real vía HTTP — no contra el código en memoria
como hacen las pruebas de Supertest. Requiere Docker instalado localmente.

## Pruebas

```
Test Suites: 6 passed, 6 total
Tests:       29 passed, 29 total
Cobertura:   97.16% statements / 90.69% branches / 100% functions / 97.16% lines
```

Casos de borde cubiertos: distancia cero y negativa, carga negativa (carga
cero se acepta como válida), tipo de vehículo no soportado, factor de
eficiencia cero y negativo, entrada con tipo incorrecto (string en vez de
number), errores inesperados en el controlador (rama 500), configuración de
factores de emisión ausente/corrupta/con valores no numéricos, y el wiring
por defecto de rutas y controlador cuando no se inyecta ninguna dependencia.

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

# Bitácora de Prompts — Carbon Tracker Microservice

Registro de los prompts principales usados durante el desarrollo del microservicio, organizados por fase del SDLC, con la técnica aplicada y las decisiones clave que salieron de cada interacción con el LLM (Claude, usado como pair programmer).

---

## Fase 1 — Diseño y Definición (Planificación)

### Prompt 1.1 — Contextualización de rol + definición de stack (Persona Prompting)

```
Actúa como un Desarrollador Backend Senior especializado en arquitecturas de
microservicios con Node.js y TypeScript. Vas a ayudarme a diseñar un
Carbon Tracker Service para una empresa de logística (EcoLogistics).

Stack: Node.js + TypeScript + Express.
Estándares a seguir: principios SOLID, separación estricta entre lógica de
negocio y capa HTTP, manejo de errores explícito (no silencioso), código
testeable con inyección de dependencias.

Antes de escribir código, quiero que documentemos el diseño.
```

**Por qué esta técnica:** fijar el rol y los estándares de codificación desde
el inicio evita que el modelo proponga patrones genéricos o inconsistentes
(por ejemplo, mezclar lógica de cálculo dentro de un controlador Express).

### Prompt 1.2 — Chain-of-Thought para el diseño del cálculo

```
Antes de escribir una sola línea de código, vamos a pensar paso a paso el
diseño del cálculo de emisiones de CO2 para transporte de carga:

1. ¿Qué variables intervienen en el cálculo (tipo de vehículo, peso de
   carga, distancia, eficiencia)?
2. ¿Qué fórmula estándar de la industria de logística relaciona estas
   variables con kg de CO2 emitidos?
3. ¿Qué factores de emisión son razonables como valores de referencia para
   vehículo eléctrico, diésel e híbrido?
4. ¿Qué casos de entrada son inválidos o límite (distancia 0, carga
   negativa, vehículo no soportado, factor de eficiencia 0)?
5. Solo después de responder 1-4, propone la interfaz TypeScript de entrada
   y salida del cálculo.
```

**Respuesta clave del LLM:** propuso la fórmula
`CO2 (kg) = distancia_km × carga_t × factor_emisión (kgCO2/t·km) × factor_eficiencia`,
identificó los 4 casos de borde que terminaron siendo la base de la
validación (`distanceKm <= 0`, `cargoWeightTons < 0`, tipo de vehículo fuera
del enum, `efficiencyFactor <= 0`), y sugirió mantener los factores de
emisión en una tabla separada (`EmissionFactors.ts`) para no acoplar los
valores de referencia a la lógica de cálculo — esto se adoptó directamente
en `src/domain/EmissionFactors.ts`.

**Por qué esta técnica:** forzar al modelo a razonar la fórmula y los casos
de borde *antes* de generar código redujo la necesidad de refactorizar
después; el diseño de validación salió completo desde el primer intento.

---

## Fase 2 — Implementación Asistida (Codificación)

### Prompt 2.1 — Generación de la función principal de cálculo

```
Con el diseño anterior, genera la clase CarbonCalculator en TypeScript.
Debe:
- Recibir el proveedor de factores de emisión por constructor (inyección de
  dependencias), no leer la tabla directamente, para que sea sustituible en
  pruebas.
- Validar todos los campos de entrada antes de calcular.
- Lanzar un error de dominio (InvalidCarbonInputError) con un mensaje
  específico por cada regla violada, no un error genérico.
- No usar `any`; tipar estrictamente la entrada y la salida.
```

### Prompt 2.2 — Refinamiento iterativo del manejo de errores (Iterative Refinement)

```
Revisa la validación que generaste. Le encuentro dos problemas:
1. Si distanceKm llega como string (ej. "cien") en vez de number, tu
   validación actual con `distanceKm <= 0` no lo detecta correctamente en
   JavaScript porque compara tipos de forma laxa. Corrígelo.
2. cargoWeightTons en 0 debería ser válido (un camión que vuelve vacío),
   pero tu primera versión lo rechazaba junto con los negativos. Sepára esa
   regla.
```

**Respuesta clave del LLM:** agregó `typeof input.distanceKm !== "number"` y
`Number.isNaN(...)` antes de la comparación numérica, y separó la regla de
`cargoWeightTons` para que solo rechace valores `< 0`, permitiendo `0`. Esta
iteración es la que quedó reflejada en `CarbonCalculator.validate()`.

**Por qué esta técnica:** el primer borrador del LLM funcionaba en el caso
feliz, pero fallaba en validaciones de tipo (type coercion de JS). El
refinamiento iterativo, señalando el bug concreto en vez de pedir "mejora el
código", produjo una corrección quirúrgica en vez de una reescritura
completa.

### Prompt 2.3 — Modularización (separar controlador de lógica de negocio)

```
Ahora separa esto en capas:
- src/domain: la lógica de negocio pura (sin Express).
- src/controllers: traduce Request/Response de Express hacia/desde el
  dominio, sin contener reglas de negocio.
- src/routes: solo define las rutas y las conecta al controlador.
Muéstrame cómo quedaría la estructura de carpetas y qué va en cada archivo.
```

**Respuesta clave del LLM:** propuso exactamente la estructura
`domain / controllers / routes / app.ts / server.ts`, con `app.ts` como
fábrica de la aplicación Express separada de `server.ts` (que solo levanta
el puerto) — esto fue clave para poder probar la API con Supertest sin abrir
un puerto real en las pruebas de integración.

---

## Fase 3 — Calidad y Pruebas (Validación)

### Prompt 3.1 — Generación de pruebas unitarias (Few-shot implícito por casos)

```
Genera una suite de pruebas con Jest para CarbonCalculator. Cubre al menos:
- Un cálculo válido por cada tipo de vehículo (electric, diesel, hybrid).
- distanceKm = 0 → debe lanzar error.
- cargoWeightTons negativo → debe lanzar error.
- cargoWeightTons = 0 → debe ser válido (no lanzar error).
- Tipo de vehículo no soportado (ej. "gasoline") → debe lanzar error.
- efficiencyFactor = 0 y negativo → debe lanzar error.
- Un caso donde se inyecte un EmissionFactorProvider falso (test double)
  para verificar que la inyección de dependencias funciona.
```

**Por qué esta técnica:** listar explícitamente los casos de borde como
"ejemplos" de lo que debía probarse (en vez de pedir "genera pruebas")
funcionó como una forma de few-shot dirigido al *comportamiento* esperado,
no solo al formato — esto garantizó que ningún caso de borde importante
quedara fuera de la suite.

### Prompt 3.2 — Pruebas de integración de la API

```
Ahora genera pruebas de integración con Supertest contra el Express app
(no contra un servidor real levantado en un puerto). Cubre el caso exitoso
(200), un caso de validación fallida (400) y el endpoint /health.
```

### Prompt 3.3 — Revisión de código (Code Review) en sesión nueva

```
Actúa como revisor de código senior enfocado en seguridad y rendimiento.
Te paso el código completo del microservicio (CarbonCalculator, controller,
routes, app.ts). Revisa específicamente:
1. ¿Hay algún vector de inyección o de datos no sanitizados?
2. ¿El manejo de errores expone información interna al cliente?
3. ¿Hay operaciones costosas o bloqueantes que deberían optimizarse?
4. ¿El código respeta principios SOLID? Señala violaciones concretas.
```

**Respuesta clave del LLM:** confirmó que el error 500 genérico no filtra
detalles del `Error` original al cliente (solo se loguea en servidor), que
no hay operaciones bloqueantes relevantes dado que el cálculo es puramente
aritmético, y que la inyección de `EmissionFactorProvider` cumple el
Principio de Inversión de Dependencias. No se encontraron vulnerabilidades
de inyección porque no hay acceso a base de datos ni ejecución de comandos
en este servicio. Esta revisión no generó cambios de código, mató un ciclo
adicional de "revisión manual" que hubiera tomado tiempo aparte.

---

## Fase 4 — Preparación para producción (ronda de mejoras post-revisión)

Tras una revisión externa (con comentarios genéricos, no específicos a este
repositorio), se decidió igualmente incorporar las tres sugerencias que sí
eran técnicamente válidas en general, adaptadas al stack real del proyecto
(TypeScript/Express, no Python/Flask):

### Prompt 4.1 — Externalizar configuración (Instrucción directa + restricciones de diseño)

```
Externaliza los factores de emisión a un archivo de configuración externo,
sin romper el diseño de inyección de dependencias que ya existe
(EmissionFactorProvider). Requisitos:
- Debe leer de config/emission-factors.json por defecto, con la ruta
  configurable via variable de entorno EMISSION_FACTORS_PATH.
- Si el archivo no existe o está mal formado, no debe tumbar el servicio:
  debe caer de vuelta a los valores estáticos actuales y loggear una
  advertencia.
- No cambies el comportamiento por defecto de CarbonCalculator (para no
  romper las pruebas existentes); expón esto como una implementación
  adicional de EmissionFactorProvider, no como reemplazo del default.
```

**Resultado:** `ConfigFileEmissionFactorProvider.ts`, que implementa la
misma interfaz que ya existía — el Principio de Inversión de Dependencias
definido desde la Fase 1 permitió agregar esta fuente de datos alternativa
sin tocar `CarbonCalculator`.

### Prompt 4.2 — Documentación OpenAPI (Estructura específica)

```
Genera una especificación OpenAPI 3.0 completa (openapi.yaml) para esta API,
incluyendo esquemas de request/response, ejemplos, y los códigos de estado
200/400/500 ya implementados en el controlador. Luego integra swagger-ui-express
para servirla en /docs.
```

### Prompt 4.3 — Prueba de integración a nivel Docker (Instructivo paso a paso)

```
Crea un Dockerfile multi-stage (build + producción) y un script de bash que:
1. Construya la imagen.
2. Levante un contenedor real.
3. Espere a que /health responda.
4. Haga un POST real a /api/carbon/calculate contra el contenedor (no contra
   el código en memoria) y valide la respuesta.
5. Valide también el caso de error 400.
6. Limpie el contenedor al finalizar, incluso si algo falla.
No puedo ejecutar Docker en este entorno de desarrollo — el script debe ser
autocontenido para que se corra en cualquier máquina con Docker instalado.
```

**Nota de honestidad:** este script no se pudo ejecutar en el entorno donde
se generó (no había Docker disponible), así que su corrección se validó por
inspección, no por ejecución real — a diferencia de las pruebas con Jest,
que sí corrieron. Queda pendiente que se ejecute `npm run docker:test` en
una máquina con Docker para confirmarlo end-to-end.

### Efecto colateral: la cobertura de pruebas bajó y hubo que restaurarla

Al agregar `ConfigFileEmissionFactorProvider` y cablear `app.ts` con más
lógica, la cobertura de branches cayó de ~90% a 83.72%, por debajo del
umbral configurado en `jest.config.js` (85%). Se le pidió al LLM cerrar
específicamente esas ramas no cubiertas (rama 500 del controlador, el
constructor por defecto de las rutas, y el branch de "factor no encontrado"
del proveedor estático) en vez de bajar el umbral — resultado: 97.16% de
statements y 90.69% de branches, con 29 pruebas en total.

---

## Resumen: técnica usada por fase

| Fase | Técnica principal | Resultado concreto |
|---|---|---|
| Diseño | Persona + Chain-of-Thought | Fórmula de cálculo y casos de borde definidos antes de codificar |
| Implementación | Instrucción directa + Refinamiento iterativo | Bug de validación de tipos corregido sin reescribir la clase |
| Modularización | Instrucción directa | Estructura domain/controllers/routes separada y testeable |
| Pruebas | Few-shot dirigido a casos | Suite con 18 pruebas y 94.2% de cobertura |
| Code Review | Persona (revisor senior) en sesión nueva | Validación de seguridad/SOLID sin cambios adicionales necesarios |
| Producción | Instrucción directa con restricciones de diseño explícitas | Config externa, OpenAPI/Swagger y prueba Docker, sin romper el diseño ni bajar la cobertura |

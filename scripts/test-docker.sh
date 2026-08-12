#!/bin/bash
# Prueba de integración a nivel Docker: construye la imagen, levanta un
# contenedor real y verifica que el servicio responde correctamente a
# través de HTTP, tal como se comportaría en producción.
#
# Requiere Docker instalado y corriendo localmente. Uso: npm run docker:test

set -euo pipefail

IMAGE="carbon-tracker-microservice:test"
CONTAINER="carbon-tracker-integration-test"
PORT=3010

cleanup() {
  echo "Limpiando contenedor de prueba..."
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Construyendo imagen Docker ($IMAGE)..."
docker build -t "$IMAGE" .

echo "==> Levantando contenedor en el puerto $PORT..."
docker run -d --name "$CONTAINER" -p "${PORT}:3000" "$IMAGE"

echo "==> Esperando a que el servicio responda en /health..."
READY=false
for _ in $(seq 1 20); do
  if curl -sf "http://localhost:${PORT}/health" >/dev/null; then
    READY=true
    break
  fi
  sleep 1
done

if [ "$READY" != "true" ]; then
  echo "FALLO: el servicio no respondió a tiempo."
  docker logs "$CONTAINER" || true
  exit 1
fi
echo "OK: /health responde."

echo "==> Probando POST /api/carbon/calculate..."
RESPONSE=$(curl -sf -X POST "http://localhost:${PORT}/api/carbon/calculate" \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"diesel","cargoWeightTons":10,"distanceKm":100}')

echo "Respuesta: $RESPONSE"

if echo "$RESPONSE" | grep -q '"co2EmissionsKg":162'; then
  echo "OK: cálculo correcto (162 kg de CO2)."
else
  echo "FALLO: el cálculo no coincide con el valor esperado (162 kg)."
  exit 1
fi

echo "==> Probando validación de entrada inválida (distanceKm=0)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:${PORT}/api/carbon/calculate" \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"diesel","cargoWeightTons":10,"distanceKm":0}')

if [ "$STATUS" = "400" ]; then
  echo "OK: la validación de entrada responde 400 como se espera."
else
  echo "FALLO: se esperaba 400, se obtuvo $STATUS."
  exit 1
fi

echo ""
echo "Prueba de integración Docker completada con éxito."

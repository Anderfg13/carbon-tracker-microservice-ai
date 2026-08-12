/**
 * Error de dominio para datos de entrada inválidos. Se distingue de errores
 * inesperados del sistema para que la capa de controladores pueda mapearlo
 * a un 400 (Bad Request) en lugar de un 500.
 */
export class InvalidCarbonInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCarbonInputError";
    Object.setPrototypeOf(this, InvalidCarbonInputError.prototype);
  }
}

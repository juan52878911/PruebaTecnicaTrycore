/**
 * Opciones que un llamante puede pasar a un método del API.
 *
 * Deliberadamente estrecho: quien consume el API no debe poder alterar la configuración de axios.
 * `signal` existe para que `resource()` cancele la petición en curso cuando cambian sus
 * parámetros o se destruye el inyector.
 */
export interface RequestOptions {
  readonly signal?: AbortSignal;
}

/** Opciones de los recursos que aceptan elegir la fórmula titular del costo al cierre. */
export interface EvmRequestOptions extends RequestOptions {
  readonly eacFormula?: string;
}

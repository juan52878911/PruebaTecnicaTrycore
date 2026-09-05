/** Instante de Java serializado en ISO-8601 UTC. Ejemplo: `2026-09-03T21:00:00Z`. */
export type IsoInstant = string;

/** Fecha de Java sin hora, en ISO-8601. Ejemplo: `2026-08-31`. */
export type IsoDate = string;

/** Proyecto tal y como lo devuelve `GET /projects`. */
export interface Project {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: IsoInstant;
  readonly updatedAt: IsoInstant;
}

/** Cuerpo de `POST /projects` y `PUT /projects/{id}`. */
export interface ProjectRequest {
  /** Obligatorio, de 1 a 120 caracteres. */
  readonly name: string;
  /** Opcional, hasta 500 caracteres. */
  readonly description: string | null;
}

/** Límites que el backend valida y que el formulario debe respetar antes de enviar. */
export const PROJECT_NAME_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500;

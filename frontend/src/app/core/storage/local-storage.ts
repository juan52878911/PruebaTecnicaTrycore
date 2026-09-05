import { InjectionToken } from '@angular/core';

/**
 * Superficie de almacenamiento que usa la aplicación.
 *
 * Es un token y no `window.localStorage` directo para poder sustituirlo en los tests por un doble
 * que falle, que es el caso que de verdad hay que cubrir: en ventana privada o con el
 * almacenamiento bloqueado, `localStorage` lanza tanto al leer como al escribir.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Almacenamiento inerte para cuando el navegador no ofrece ninguno utilizable. */
export const NULL_STORAGE: KeyValueStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const LOCAL_STORAGE = new InjectionToken<KeyValueStorage>('LocalStorage', {
  providedIn: 'root',
  factory: (): KeyValueStorage => {
    try {
      // El mero acceso ya lanza en algunos navegadores con las cookies desactivadas.
      return globalThis.localStorage ?? NULL_STORAGE;
    } catch {
      return NULL_STORAGE;
    }
  },
});

/** Lee una clave sin propagar los fallos del almacenamiento. */
export function readKey(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Escribe una clave sin propagar los fallos del almacenamiento. */
export function writeKey(storage: KeyValueStorage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Una preferencia que no se puede persistir no es motivo para romper la aplicación: la
    // sesión sigue funcionando con el valor en memoria.
  }
}

import { computed, inject, Injectable, signal, Signal } from '@angular/core';

import { LOCAL_STORAGE, readKey, writeKey } from '../storage/local-storage';

const SELECTED_PROJECT_KEY = 'valora.selectedProject.v1';

function parseId(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Proyecto activo del panel y de la vista de actividades.
 *
 * Se guarda entre sesiones para que recargar no devuelva al usuario al primer proyecto de la
 * lista. Es `undefined` y no `null` cuando no hay selección: `resource()` interpreta unos
 * parámetros `undefined` como "todavía no cargues", mientras que con `null` sí dispararía la
 * carga y le llegaría `null` como identificador.
 */
@Injectable({ providedIn: 'root' })
export class SelectedProjectStore {
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly selected = signal<number | undefined>(
    parseId(readKey(this.storage, SELECTED_PROJECT_KEY)),
  );

  readonly projectId: Signal<number | undefined> = this.selected.asReadonly();
  readonly hasSelection = computed(() => this.selected() !== undefined);

  select(projectId: number): void {
    this.selected.set(projectId);
    writeKey(this.storage, SELECTED_PROJECT_KEY, String(projectId));
  }

  /** Elige el primero disponible si el guardado ya no existe o nunca hubo selección. */
  ensureSelection(available: readonly { readonly id: number }[]): void {
    if (available.length === 0) {
      return;
    }
    const current = this.selected();
    if (current !== undefined && available.some((project) => project.id === current)) {
      return;
    }
    const first = available[0];
    if (first !== undefined) {
      this.select(first.id);
    }
  }
}

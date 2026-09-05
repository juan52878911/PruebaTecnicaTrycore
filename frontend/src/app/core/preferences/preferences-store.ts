import { computed, inject, Injectable, signal, Signal } from '@angular/core';

import { LOCAL_STORAGE, readKey, writeKey } from '../storage/local-storage';
import { parsePreferences } from './preferences-parser';
import { DEFAULT_PREFERENCES, Preferences, PREFERENCES_STORAGE_KEY } from './preferences.model';

/**
 * Origen de verdad de las preferencias del usuario.
 *
 * Expone un signal de solo lectura, de modo que cualquier cambio repinta la interfaz al instante
 * incluso sin zone.js: lo que marca la vista como sucia es la escritura del signal, no el hecho
 * de haber persistido en el almacenamiento.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly storage = inject(LOCAL_STORAGE);
  // Los campos se inicializan en orden de declaración, así que `storage` ya está resuelto aquí.
  private readonly state = signal<Preferences>(
    parsePreferences(readKey(this.storage, PREFERENCES_STORAGE_KEY)),
  );

  readonly preferences: Signal<Preferences> = this.state.asReadonly();

  readonly indicatorNaming = computed(() => this.state().indicatorNaming);
  readonly showInterpretation = computed(() => this.state().showInterpretation);
  readonly autoRefreshAfterSave = computed(() => this.state().autoRefreshAfterSave);
  readonly currencyCode = computed(() => this.state().currencyCode);
  readonly eacFormula = computed(() => this.state().eacFormula);

  /** Aplica y persiste un cambio parcial. */
  update(changes: Partial<Preferences>): void {
    this.state.update((current) => this.persist({ ...current, ...changes }));
  }

  /** Vuelve a los valores por defecto. */
  reset(): void {
    this.state.set(this.persist(DEFAULT_PREFERENCES));
  }

  private persist(next: Preferences): Preferences {
    writeKey(this.storage, PREFERENCES_STORAGE_KEY, JSON.stringify(next));
    return next;
  }
}

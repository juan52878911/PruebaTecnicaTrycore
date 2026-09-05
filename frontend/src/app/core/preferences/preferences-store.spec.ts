import { TestBed } from '@angular/core/testing';

import { KeyValueStorage, LOCAL_STORAGE } from '../storage/local-storage';
import { PreferencesStore } from './preferences-store';
import { DEFAULT_PREFERENCES, PREFERENCES_STORAGE_KEY } from './preferences.model';

function memoryStorage(initial?: string): KeyValueStorage & { readonly written: string[] } {
  let value: string | null = initial ?? null;
  const written: string[] = [];
  return {
    written,
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
      written.push(next);
    },
    removeItem: () => {
      value = null;
    },
  };
}

/** Almacenamiento que falla, como el de una ventana privada o con las cookies bloqueadas. */
function throwingStorage(): KeyValueStorage {
  return {
    getItem: () => {
      throw new Error('acceso denegado al almacenamiento');
    },
    setItem: () => {
      throw new Error('cuota excedida');
    },
    removeItem: () => {
      throw new Error('acceso denegado al almacenamiento');
    },
  };
}

function storeWith(storage: KeyValueStorage): PreferencesStore {
  TestBed.configureTestingModule({ providers: [{ provide: LOCAL_STORAGE, useValue: storage }] });
  return TestBed.inject(PreferencesStore);
}

describe('PreferencesStore', () => {
  it('arranca con los valores por defecto cuando no hay nada guardado', () => {
    const store = storeWith(memoryStorage());

    expect(store.preferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('recupera lo que se guardó en una sesión anterior', () => {
    const store = storeWith(
      memoryStorage(JSON.stringify({ ...DEFAULT_PREFERENCES, indicatorNaming: 'claro' })),
    );

    expect(store.indicatorNaming()).toBe('claro');
  });

  it('persiste el cambio y lo publica en el signal', () => {
    const storage = memoryStorage();
    const store = storeWith(storage);

    store.update({ showInterpretation: false });

    expect(store.showInterpretation()).toBe(false);
    expect(JSON.parse(storage.written[0] ?? '{}')).toMatchObject({ showInterpretation: false });
  });

  it('conserva el resto de ajustes al cambiar uno solo', () => {
    const store = storeWith(memoryStorage());

    store.update({ currencyCode: 'COP' });

    expect(store.preferences()).toEqual({ ...DEFAULT_PREFERENCES, currencyCode: 'COP' });
  });

  it('vuelve a los valores por defecto al restablecer', () => {
    const store = storeWith(memoryStorage());
    store.update({ indicatorNaming: 'claro', criticalThreshold: 0.5 });

    store.reset();

    expect(store.preferences()).toEqual(DEFAULT_PREFERENCES);
  });

  describe('almacenamiento no disponible', () => {
    it('arranca con los valores por defecto si la lectura lanza', () => {
      expect(storeWith(throwingStorage()).preferences()).toEqual(DEFAULT_PREFERENCES);
    });

    it('aplica el cambio en memoria aunque la escritura lance', () => {
      const store = storeWith(throwingStorage());

      expect(() => store.update({ indicatorNaming: 'claro' })).not.toThrow();
      expect(store.indicatorNaming()).toBe('claro');
    });
  });

  it('usa una clave con versión, para poder descartar formas antiguas de golpe', () => {
    expect(PREFERENCES_STORAGE_KEY).toBe('valora.preferences.v1');
  });
});

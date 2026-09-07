import { TestBed } from '@angular/core/testing';

import { BreakpointService, DESKTOP_MIN_WIDTH_PX } from './breakpoint.service';

/**
 * Doble de `MediaQueryList` que permite disparar el cambio a mano y contar los oyentes, que es lo
 * que hace falta para comprobar que el servicio reacciona al redimensionado y se desuscribe.
 */
class FakeMediaQueryList {
  matches: boolean;
  readonly media: string;
  readonly oyentes = new Set<(event: MediaQueryListEvent) => void>();

  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }

  addEventListener(_tipo: 'change', oyente: (event: MediaQueryListEvent) => void): void {
    this.oyentes.add(oyente);
  }

  removeEventListener(_tipo: 'change', oyente: (event: MediaQueryListEvent) => void): void {
    this.oyentes.delete(oyente);
  }

  /** Simula que la ventana cruzó el umbral. */
  cambiarA(matches: boolean): void {
    this.matches = matches;
    for (const oyente of this.oyentes) {
      oyente({ matches } as MediaQueryListEvent);
    }
  }
}

describe('BreakpointService', () => {
  let creadas: FakeMediaQueryList[];
  let original: typeof globalThis.matchMedia | undefined;

  function instalarMatchMedia(inicial: boolean): void {
    creadas = [];
    original = globalThis.matchMedia;
    globalThis.matchMedia = ((media: string) => {
      const lista = new FakeMediaQueryList(media, inicial);
      creadas.push(lista);
      return lista as unknown as MediaQueryList;
    }) as typeof globalThis.matchMedia;
  }

  /** La consulta que creó el servicio; falla la prueba si no llegó a crear ninguna. */
  function consulta(): FakeMediaQueryList {
    const primera = creadas[0];
    if (primera === undefined) {
      throw new Error('El servicio no creó ninguna consulta de medios');
    }
    return primera;
  }

  afterEach(() => {
    if (original === undefined) {
      delete (globalThis as { matchMedia?: unknown }).matchMedia;
    } else {
      globalThis.matchMedia = original;
    }
    TestBed.resetTestingModule();
  });

  it('consulta el umbral de escritorio declarado', () => {
    instalarMatchMedia(true);

    TestBed.inject(BreakpointService);

    expect(consulta().media).toBe(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
  });

  it('parte del ancho que tiene la ventana al arrancar', () => {
    instalarMatchMedia(false);

    expect(TestBed.inject(BreakpointService).isDesktop()).toBe(false);
  });

  it('pasa a escritorio cuando la ventana se agranda, sin recargar', () => {
    // Es el caso que se veía en la práctica: abrir la aplicación en una ventana estrecha,
    // agrandarla y quedarse con el diseño de móvil hasta recargar.
    instalarMatchMedia(false);
    const servicio = TestBed.inject(BreakpointService);

    consulta().cambiarA(true);

    expect(servicio.isDesktop()).toBe(true);
  });

  it('vuelve a móvil cuando la ventana se estrecha', () => {
    instalarMatchMedia(true);
    const servicio = TestBed.inject(BreakpointService);

    consulta().cambiarA(false);

    expect(servicio.isDesktop()).toBe(false);
  });

  it('usa una sola consulta y conserva su referencia, para que el oyente no se pierda', () => {
    // Un MediaQueryList sin referencias puede ser recogido junto a su oyente, y entonces la vista
    // deja de reaccionar sin que nada falle de forma visible.
    instalarMatchMedia(true);

    TestBed.inject(BreakpointService);

    expect(creadas).toHaveLength(1);
    expect(consulta().oyentes.size).toBe(1);
  });

  it('se desuscribe cuando la aplicación se destruye', () => {
    instalarMatchMedia(true);
    TestBed.inject(BreakpointService);

    TestBed.resetTestingModule();

    expect(consulta().oyentes.size).toBe(0);
  });

  it('se comporta como escritorio donde no existe matchMedia', () => {
    original = globalThis.matchMedia;
    delete (globalThis as { matchMedia?: unknown }).matchMedia;
    creadas = [];

    expect(TestBed.inject(BreakpointService).isDesktop()).toBe(true);
  });
});

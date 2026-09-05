import { computed, inject, Injectable, resource, signal, Signal } from '@angular/core';

import { ApiError, asDisplayableError, toApiError } from '../../core/api/api-error';
import { Project, ProjectRequest } from '../../core/api/models/project';
import { ProjectsApi } from '../../core/api/projects-api';

/**
 * Fachada de los proyectos.
 *
 * Solo expone signals: ni una promesa ni un observable cruza la frontera hacia el componente. En
 * una aplicación sin zone.js, lo que repinta la vista es la escritura de un signal que la
 * plantilla lee, no el hecho de que la promesa se resuelva.
 *
 * Las escrituras nunca rechazan hacia el llamante: el fallo viaja por `error()`. Así un rechazo
 * olvidado no aparece como excepción sin capturar en la consola.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly api = inject(ProjectsApi);

  private readonly mutating = signal(false);
  private readonly mutationError = signal<ApiError | null>(null);

  private readonly listResource = resource<Project[], void>({
    loader: ({ abortSignal }) => this.api.list({ signal: abortSignal }),
    defaultValue: [],
  });

  /**
   * Lista publicada.
   *
   * Se lee a través de `hasValue()` y no directamente de `value()`: en Angular 22 un recurso en
   * estado de error LANZA al leer su valor, incluso habiendo declarado `defaultValue`. Sin esta
   * guarda, cualquier fallo del API rompería la plantilla en lugar de mostrar el aviso.
   */
  readonly projects: Signal<readonly Project[]> = computed(() =>
    this.listResource.hasValue() ? this.listResource.value() : [],
  );
  readonly isLoading = computed(() => this.listResource.isLoading() || this.mutating());
  readonly error = computed(
    () => asDisplayableError(this.listResource.error()) ?? this.mutationError(),
  );
  readonly isEmpty = computed(() => !this.isLoading() && this.projects().length === 0);

  reload(): void {
    this.listResource.reload();
  }

  clearError(): void {
    this.mutationError.set(null);
  }

  byId(id: number): Signal<Project | undefined> {
    return computed(() => this.projects().find((project) => project.id === id));
  }

  async create(request: ProjectRequest): Promise<Project | null> {
    return this.mutate(() => this.api.create(request));
  }

  async update(id: number, request: ProjectRequest): Promise<Project | null> {
    return this.mutate(() => this.api.update(id, request));
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.mutate(async () => {
      await this.api.remove(id);
      return true as const;
    });
    return result === true;
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T | null> {
    this.mutating.set(true);
    this.mutationError.set(null);
    try {
      const result = await operation();
      this.listResource.reload();
      return result;
    } catch (error: unknown) {
      this.mutationError.set(toApiError(error));
      return null;
    } finally {
      this.mutating.set(false);
    }
  }
}

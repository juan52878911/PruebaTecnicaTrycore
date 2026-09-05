import { inject, Injectable, signal } from '@angular/core';

import { ApiError, toApiError } from '../../core/api/api-error';
import { Project, ProjectRequest } from '../../core/api/models/project';
import { ProjectsApi } from '../../core/api/projects-api';
import { ProjectSummariesStore } from './project-summaries-store';

/**
 * Escrituras sobre proyectos.
 *
 * La lectura vive en `ProjectSummariesStore`, que trae cada proyecto con su consolidado en una
 * sola petición; tener aquí otra lista sería pedir dos veces lo mismo. Tras cada escritura se
 * recarga ese consolidado, que es lo que pintan el listado, el perfil y el selector.
 *
 * Solo expone signals: ni una promesa ni un observable cruza la frontera hacia el componente. En
 * una aplicación sin zone.js, lo que repinta la vista es la escritura de un signal que la
 * plantilla lee, no el hecho de que la promesa se resuelva. Las escrituras nunca rechazan hacia
 * el llamante: el fallo viaja por `error()`, así un rechazo olvidado no aparece como excepción sin
 * capturar en la consola.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly api = inject(ProjectsApi);
  private readonly summaries = inject(ProjectSummariesStore);

  private readonly mutating = signal(false);
  private readonly mutationError = signal<ApiError | null>(null);

  readonly isMutating = this.mutating.asReadonly();
  readonly error = this.mutationError.asReadonly();

  clearError(): void {
    this.mutationError.set(null);
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
      this.summaries.reload();
      return result;
    } catch (error: unknown) {
      this.mutationError.set(toApiError(error));
      return null;
    } finally {
      this.mutating.set(false);
    }
  }
}

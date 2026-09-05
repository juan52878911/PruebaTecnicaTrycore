import { inject, Injectable } from '@angular/core';
import type { AxiosInstance } from 'axios';

import { AXIOS_INSTANCE } from './axios-instance';
import { Project, ProjectRequest } from './models/project';
import { ProjectEvmSummary } from './models/activity';
import { EvmRequestOptions, RequestOptions } from './request-options';

/** Acceso a los recursos de proyecto. Sin estado: solo traduce endpoints a promesas tipadas. */
@Injectable({ providedIn: 'root' })
export class ProjectsApi {
  private readonly http: AxiosInstance = inject(AXIOS_INSTANCE);

  private static readonly PATH = '/projects';

  async list(options?: RequestOptions): Promise<Project[]> {
    const response = await this.http.get<Project[]>(ProjectsApi.PATH, options);
    return response.data;
  }

  async getById(id: number, options?: RequestOptions): Promise<Project> {
    const response = await this.http.get<Project>(`${ProjectsApi.PATH}/${id}`, options);
    return response.data;
  }

  async create(request: ProjectRequest, options?: RequestOptions): Promise<Project> {
    const response = await this.http.post<Project>(ProjectsApi.PATH, request, options);
    return response.data;
  }

  async update(id: number, request: ProjectRequest, options?: RequestOptions): Promise<Project> {
    const response = await this.http.put<Project>(`${ProjectsApi.PATH}/${id}`, request, options);
    return response.data;
  }

  async remove(id: number, options?: RequestOptions): Promise<void> {
    await this.http.delete<void>(`${ProjectsApi.PATH}/${id}`, options);
  }

  /**
   * Resumen consolidado con los indicadores del proyecto y de cada una de sus actividades.
   *
   * `eacFormula` elige cuál de las tres estimaciones va como titular; las otras dos vienen igual
   * en `indicators.estimates`. Un valor que el servidor no reconozca responde 400.
   */
  async evmSummary(id: number, options?: EvmRequestOptions): Promise<ProjectEvmSummary> {
    const response = await this.http.get<ProjectEvmSummary>(`${ProjectsApi.PATH}/${id}/evm`, {
      signal: options?.signal,
      ...(options?.eacFormula === undefined ? {} : { params: { eacFormula: options.eacFormula } }),
    });
    return response.data;
  }
}

import { inject, Injectable } from '@angular/core';
import type { AxiosInstance } from 'axios';

import { AXIOS_INSTANCE } from './axios-instance';
import { Project, ProjectRequest } from './models/project';
import { ProjectEvmSummary } from './models/activity';
import { RequestOptions } from './request-options';

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

  /** Resumen consolidado con los indicadores del proyecto y de cada una de sus actividades. */
  async evmSummary(id: number, options?: RequestOptions): Promise<ProjectEvmSummary> {
    const response = await this.http.get<ProjectEvmSummary>(
      `${ProjectsApi.PATH}/${id}/evm`,
      options,
    );
    return response.data;
  }
}

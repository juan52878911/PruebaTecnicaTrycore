import { inject, Injectable } from '@angular/core';
import type { AxiosInstance } from 'axios';

import { AXIOS_INSTANCE } from './axios-instance';
import { Measurement, MeasurementRequest, ProjectTimeline } from './models/measurement';
import { RequestOptions } from './request-options';

/**
 * Acceso al histórico de cortes y a la serie temporal que alimenta la curva S.
 *
 * Un corte no se actualiza: para rectificarlo se borra y se vuelve a tomar. Por eso no hay `update`.
 */
@Injectable({ providedIn: 'root' })
export class MeasurementsApi {
  private readonly http: AxiosInstance = inject(AXIOS_INSTANCE);

  private static path(projectId: number): string {
    return `/projects/${projectId}/measurements`;
  }

  async list(projectId: number, options?: RequestOptions): Promise<Measurement[]> {
    const response = await this.http.get<Measurement[]>(MeasurementsApi.path(projectId), options);
    return response.data;
  }

  async getById(
    projectId: number,
    measurementId: number,
    options?: RequestOptions,
  ): Promise<Measurement> {
    const response = await this.http.get<Measurement>(
      `${MeasurementsApi.path(projectId)}/${measurementId}`,
      options,
    );
    return response.data;
  }

  /**
   * Registra un corte. No se envían cifras: el servidor las toma de las actividades tal como
   * están en ese momento. Un corte repetido en la misma fecha responde 409.
   */
  async create(
    projectId: number,
    request: MeasurementRequest,
    options?: RequestOptions,
  ): Promise<Measurement> {
    const response = await this.http.post<Measurement>(
      MeasurementsApi.path(projectId),
      request,
      options,
    );
    return response.data;
  }

  async remove(projectId: number, measurementId: number, options?: RequestOptions): Promise<void> {
    await this.http.delete<void>(`${MeasurementsApi.path(projectId)}/${measurementId}`, options);
  }

  /** Serie de puntos por corte, en orden cronológico ascendente. */
  async timeline(projectId: number, options?: RequestOptions): Promise<ProjectTimeline> {
    const response = await this.http.get<ProjectTimeline>(
      `/projects/${projectId}/timeline`,
      options,
    );
    return response.data;
  }
}

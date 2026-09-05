import { inject, Injectable } from '@angular/core';
import type { AxiosInstance } from 'axios';

import { AXIOS_INSTANCE } from './axios-instance';
import { Activity, ActivityRequest } from './models/activity';
import { RequestOptions } from './request-options';

/** Acceso a las actividades de un proyecto. */
@Injectable({ providedIn: 'root' })
export class ActivitiesApi {
  private readonly http: AxiosInstance = inject(AXIOS_INSTANCE);

  private static path(projectId: number): string {
    return `/projects/${projectId}/activities`;
  }

  async list(projectId: number, options?: RequestOptions): Promise<Activity[]> {
    const response = await this.http.get<Activity[]>(ActivitiesApi.path(projectId), options);
    return response.data;
  }

  async create(
    projectId: number,
    request: ActivityRequest,
    options?: RequestOptions,
  ): Promise<Activity> {
    const response = await this.http.post<Activity>(
      ActivitiesApi.path(projectId),
      request,
      options,
    );
    return response.data;
  }

  async update(
    projectId: number,
    activityId: number,
    request: ActivityRequest,
    options?: RequestOptions,
  ): Promise<Activity> {
    const response = await this.http.put<Activity>(
      `${ActivitiesApi.path(projectId)}/${activityId}`,
      request,
      options,
    );
    return response.data;
  }

  async remove(projectId: number, activityId: number, options?: RequestOptions): Promise<void> {
    await this.http.delete<void>(`${ActivitiesApi.path(projectId)}/${activityId}`, options);
  }
}

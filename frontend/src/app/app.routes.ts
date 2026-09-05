import { Routes } from '@angular/router';

/**
 * Rutas de la aplicación, todas con carga diferida.
 *
 * Las de proyecto llevan el identificador en la URL a propósito: un panel o un detalle de
 * actividad tienen que poder compartirse por enlace, y el estado del proyecto seleccionado no
 * puede vivir solo en memoria.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  {
    path: 'panel',
    title: 'Panel · Valora',
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'proyectos',
    title: 'Proyectos · Valora',
    loadComponent: () => import('./features/projects/projects-page').then((m) => m.ProjectsPage),
  },
  {
    path: 'proyectos/:projectId/actividades',
    title: 'Actividades · Valora',
    loadComponent: () =>
      import('./features/activities/activities-page').then((m) => m.ActivitiesPage),
  },
  {
    path: 'proyectos/:projectId/actividades/:activityId',
    title: 'Detalle de actividad · Valora',
    loadComponent: () =>
      import('./features/activities/activity-detail-page').then((m) => m.ActivityDetailPage),
  },
  {
    path: 'ajustes',
    title: 'Ajustes · Valora',
    loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'perfil',
    title: 'Perfil · Valora',
    loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: '**',
    title: 'Página no encontrada · Valora',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];

/** Destinos de la navegación principal, compartidos por la barra de escritorio y la de móvil. */
export interface NavItem {
  readonly path: string;
  readonly label: string;
  /** Trazado del icono de Material Symbols, en una caja de 24. */
  readonly icon: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    path: '/panel',
    label: 'Panel',
    icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  },
  {
    path: '/proyectos',
    label: 'Proyectos',
    icon: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  },
  {
    path: '/ajustes',
    label: 'Ajustes',
    icon: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  },
];

import { Injectable, signal, Signal } from '@angular/core';

export type ToastTone = 'ok' | 'info' | 'error';

export interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly title: string;
  readonly body: string;
}

const DISMISS_AFTER_MS = 4000;

/** Avisos efímeros de la esquina inferior. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<readonly Toast[]>([]);
  private nextId = 1;

  readonly toasts: Signal<readonly Toast[]> = this.items.asReadonly();

  show(tone: ToastTone, title: string, body: string): void {
    const toast: Toast = { id: this.nextId++, tone, title, body };
    this.items.update((current) => [...current, toast]);
    setTimeout(() => this.dismiss(toast.id), DISMISS_AFTER_MS);
  }

  success(title: string, body: string): void {
    this.show('ok', title, body);
  }

  info(title: string, body: string): void {
    this.show('info', title, body);
  }

  error(title: string, body: string): void {
    this.show('error', title, body);
  }

  dismiss(id: number): void {
    this.items.update((current) => current.filter((toast) => toast.id !== id));
  }
}

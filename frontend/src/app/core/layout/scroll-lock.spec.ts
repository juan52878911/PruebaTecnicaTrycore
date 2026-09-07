import { TestBed } from '@angular/core/testing';

import { ScrollLock } from './scroll-lock';

describe('ScrollLock', () => {
  let lock: ScrollLock;

  beforeEach(() => {
    lock = TestBed.inject(ScrollLock);
    document.body.classList.remove('scroll-locked');
  });

  it('marca el documento al abrir la primera capa y lo libera al cerrar la última', () => {
    lock.lock();
    expect(document.body.classList.contains('scroll-locked')).toBe(true);

    lock.lock();
    lock.unlock();
    expect(document.body.classList.contains('scroll-locked')).toBe(true);

    lock.unlock();
    expect(document.body.classList.contains('scroll-locked')).toBe(false);
  });

  it('ignora una liberación de más', () => {
    lock.unlock();
    lock.lock();
    expect(document.body.classList.contains('scroll-locked')).toBe(true);
    lock.unlock();
    expect(document.body.classList.contains('scroll-locked')).toBe(false);
  });
});

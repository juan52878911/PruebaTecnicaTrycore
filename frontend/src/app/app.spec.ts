import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { provideApiTesting } from './core/api/testing/fake-adapter';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), ...provideApiTesting()],
    }).compileComponents();
  });

  it('monta el marco de la aplicación', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('monta una sola región de navegación, no las dos a la vez', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const navigations = (fixture.nativeElement as HTMLElement).querySelectorAll('nav');

    expect(navigations.length).toBe(1);
  });

  it('deja sitio a la salida del enrutador y a los avisos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('main')).not.toBeNull();
    expect(element.querySelector('app-toast-host')).not.toBeNull();
  });
});

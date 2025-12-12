import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Theme } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'edc-public-dashboard-theme';
  private themeSubject = new BehaviorSubject<Theme>('system');
  private currentTheme$ = this.themeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  get theme$(): Observable<Theme> {
    return this.currentTheme$;
  }

  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    // Theme toggle disabled - always dark mode
  }

  private getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme || 'dark';
    this.themeSubject.next(savedTheme);
    this.applyTheme(savedTheme);
  }

  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    htmlElement.classList.add('dark');
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#1f2937');
    }
  }

  private listenToSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      if (this.themeSubject.value === 'system') {
        this.applyTheme('system');
      }
    });
  }

  getEffectiveTheme(): 'light' | 'dark' {
    return 'dark';
  }

  isDark(): boolean {
    return true;
  }

  isLight(): boolean {
    return false;
  }
}
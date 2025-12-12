import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserPreferencesService } from './user-preferences.service';

export interface LogoConfig {
  url: string | null;
  name: string | null;
  size: number | null;
  type: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private preferencesService = inject(UserPreferencesService);
  private logoSubject = new BehaviorSubject<LogoConfig>(this.loadLogoFromPreferences());
  
  public logo$ = this.logoSubject.asObservable();

  constructor() {
    this.preferencesService.preferences$.subscribe(prefs => {
      const logo: LogoConfig = {
        url: prefs.logoUrl || null,
        name: prefs.logoName || null,
        size: prefs.logoSize || null,
        type: prefs.logoType || null
      };
      this.logoSubject.next(logo);
    });
  }

  private loadLogoFromPreferences(): LogoConfig {
    const prefs = this.preferencesService.currentPreferences;
    return {
      url: prefs.logoUrl || null,
      name: prefs.logoName || null,
      size: prefs.logoSize || null,
      type: prefs.logoType || null
    };
  }

  private saveLogoToPreferences(logo: LogoConfig): void {
    this.preferencesService.updatePreferences({
      logoUrl: logo.url || undefined,
      logoName: logo.name || undefined,
      logoSize: logo.size || undefined,
      logoType: logo.type || undefined
    });
  }

  setLogo(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isValidImageFile(file)) {
        reject(new Error('File non valido. Seleziona un\'immagine PNG, JPG o SVG.'));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('File troppo grande. Dimensione massima: 2MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const logo: LogoConfig = {
          url: e.target?.result as string,
          name: file.name,
          size: file.size,
          type: file.type
        };

        this.logoSubject.next(logo);
        this.saveLogoToPreferences(logo);
        resolve();
      };

      reader.onerror = () => {
        reject(new Error('Errore durante la lettura del file.'));
      };

      reader.readAsDataURL(file);
    });
  }

  removeLogo(): void {
    const logo: LogoConfig = { url: null, name: null, size: null, type: null };
    this.logoSubject.next(logo);
    this.saveLogoToPreferences(logo);
  }

  getCurrentLogo(): LogoConfig {
    return this.logoSubject.value;
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    return validTypes.includes(file.type);
  }

  getRecommendedDimensions(): { width: number; height: number } {
    return { width: 200, height: 60 };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

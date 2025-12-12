import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ConfigService } from './config.service';

export interface UserPreferences {
  // Theme & Appearance
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'orange';
  language: 'it' | 'en';
  
  logoUrl?: string;
  logoName?: string;
  logoSize?: number;
  logoType?: string;
  
  // Dashboard & Layout
  sidebarCollapsed: boolean;
  showNotifications: boolean;
  autoRefreshInterval: number; // in seconds
  defaultPageSize: number;
  
  // Data & Filters
  defaultDateRange: 'today' | 'week' | 'month' | 'year';
  favoriteFilters: string[];
  savedSearches: SavedSearch[];
  
  // Advanced Features
  developerMode: boolean;
  debugMode: boolean;
  experimentalFeatures: boolean;
  apiEndpoint: string;
  
  // Accessibility
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY_PREFIX = 'edc-public-dashboard-preferences';
  private readonly GLOBAL_STORAGE_KEY = 'edc-public-dashboard-preferences-global';
  private configService = inject(ConfigService);
  private translateService = inject(TranslateService);
  
  private currentUserId: string | null = null;
  
  private readonly defaultPreferences: UserPreferences = {
    // Theme & Appearance
    theme: 'dark',
    compactMode: false,
    animations: true,
    fontSize: 'medium',
    colorScheme: 'default',
    language: 'en',
    
    // Dashboard & Layout
    sidebarCollapsed: false,
    showNotifications: true,
    autoRefreshInterval: 30,
    defaultPageSize: 10,
    
    // Data & Filters
    defaultDateRange: 'week',
    favoriteFilters: [],
    savedSearches: [],
    
    // Advanced Features
    developerMode: false,
    debugMode: false,
    experimentalFeatures: false,
    apiEndpoint: this.configService.getApiUrl(),
    
    // Accessibility
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: false
  };

  private preferencesSubject = new BehaviorSubject<UserPreferences>(this.loadPreferences());

  constructor() {
    // Listen for storage changes in other tabs
    window.addEventListener('storage', (e) => {
      const currentStorageKey = this.getStorageKey();
      if (e.key === currentStorageKey && e.newValue) {
        try {
          const newPreferences = JSON.parse(e.newValue);
          this.preferencesSubject.next(newPreferences);
        } catch {
          // Ignore storage parsing errors
        }
      }
    });

    // Listen to system theme changes
    this.listenToSystemTheme();

    // Apply initial preferences
    this.applyPreferences(this.preferencesSubject.value);
  }

  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
    const newPreferences = this.loadPreferences();
    this.preferencesSubject.next(newPreferences);
    this.applyPreferences(newPreferences);
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private getStorageKey(): string {
    return this.currentUserId 
      ? `${this.STORAGE_KEY_PREFIX}-user-${this.currentUserId}`
      : this.GLOBAL_STORAGE_KEY;
  }

  get preferences$(): Observable<UserPreferences> {
    return this.preferencesSubject.asObservable();
  }

  get currentPreferences(): UserPreferences {
    return this.preferencesSubject.value;
  }

  private loadPreferences(): UserPreferences {
    try {
      const storageKey = this.getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new preference keys
        return { ...this.defaultPreferences, ...parsed };
      }
    } catch {
      // Ignore localStorage errors, use defaults
    }
    return this.defaultPreferences;
  }

  private savePreferences(preferences: UserPreferences): void {
    try {
      const storageKey = this.getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // Ignore localStorage save errors
    }
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    const newPreferences = { ...this.preferencesSubject.value, ...updates };
    
    this.savePreferences(newPreferences);
    this.preferencesSubject.next(newPreferences);
    this.applyPreferences(newPreferences);
    
    // Update language in translate service if changed
    if (updates.language) {
      this.translateService.use(updates.language);
    }
    
    // Apply specific preferences immediately if changed
    if (updates.theme !== undefined) {
      this.applyTheme(updates.theme);
    }
    if (updates.fontSize !== undefined) {
      this.applyFontSize(updates.fontSize);
    }
    if (updates.animations !== undefined) {
      this.applyAnimations(updates.animations);
    }
    if (updates.highContrast !== undefined) {
      this.applyHighContrast(updates.highContrast);
    }
    if (updates.reducedMotion !== undefined) {
      this.applyReducedMotion(updates.reducedMotion);
    }
    if (updates.colorScheme !== undefined) {
      this.applyColorScheme(updates.colorScheme);
    }
  }

  resetPreferences(): void {
    const defaultPrefs = { ...this.defaultPreferences };
    this.savePreferences(defaultPrefs);
    this.preferencesSubject.next(defaultPrefs);
    this.applyPreferences(defaultPrefs);
  }

  exportPreferences(): string {
    return JSON.stringify(this.currentPreferences, null, 2);
  }

  importPreferences(preferencesJson: string): boolean {
    try {
      const imported = JSON.parse(preferencesJson);
      // Validate that it's a valid preferences object
      if (typeof imported === 'object' && imported !== null) {
        const mergedPreferences = { ...this.defaultPreferences, ...imported };
        this.updatePreferences(mergedPreferences);
        return true;
      }
    } catch {
      // Invalid preferences JSON
    }
    return false;
  }

  // Saved Searches
  addSavedSearch(name: string, query: string, filters: Record<string, any>): void {
    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      createdAt: new Date()
    };
    
    const currentSearches = this.currentPreferences.savedSearches;
    this.updatePreferences({
      savedSearches: [...currentSearches, savedSearch]
    });
  }

  removeSavedSearch(id: string): void {
    const currentSearches = this.currentPreferences.savedSearches;
    this.updatePreferences({
      savedSearches: currentSearches.filter(search => search.id !== id)
    });
  }

  // Favorite Filters
  addFavoriteFilter(filter: string): void {
    const currentFilters = this.currentPreferences.favoriteFilters;
    if (!currentFilters.includes(filter)) {
      this.updatePreferences({
        favoriteFilters: [...currentFilters, filter]
      });
    }
  }

  removeFavoriteFilter(filter: string): void {
    const currentFilters = this.currentPreferences.favoriteFilters;
    this.updatePreferences({
      favoriteFilters: currentFilters.filter(f => f !== filter)
    });
  }

  private applyPreferences(preferences: UserPreferences): void {
    // Apply theme
    this.applyTheme(preferences.theme);
    
    // Apply font size
    this.applyFontSize(preferences.fontSize);
    
    // Apply animations
    this.applyAnimations(preferences.animations);
    
    // Apply high contrast
    this.applyHighContrast(preferences.highContrast);
    
    // Apply reduced motion
    this.applyReducedMotion(preferences.reducedMotion);
    
    // Apply color scheme
    this.applyColorScheme(preferences.colorScheme);
  }

  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    const html = document.documentElement;
    html.classList.add('dark');

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#1f2937');
    }
  }

  private applyFontSize(fontSize: 'small' | 'medium' | 'large'): void {
    const html = document.documentElement;
    html.classList.remove('text-sm', 'text-base', 'text-lg');
    
    switch (fontSize) {
      case 'small':
        html.classList.add('text-sm');
        break;
      case 'large':
        html.classList.add('text-lg');
        break;
      default:
        html.classList.add('text-base');
    }
  }

  private applyAnimations(enabled: boolean): void {
    const html = document.documentElement;
    if (!enabled) {
      html.style.setProperty('--animation-duration', '0s');
      html.style.setProperty('--transition-duration', '0s');
    } else {
      html.style.removeProperty('--animation-duration');
      html.style.removeProperty('--transition-duration');
    }
  }

  private applyHighContrast(enabled: boolean): void {
    document.documentElement.classList.toggle('high-contrast', enabled);
  }

  private applyReducedMotion(enabled: boolean): void {
    document.documentElement.classList.toggle('reduce-motion', enabled);
  }

  private applyColorScheme(scheme: string): void {
    const html = document.documentElement;
    // Remove existing color scheme classes
    html.classList.remove('scheme-blue', 'scheme-green', 'scheme-purple', 'scheme-orange');
    
    if (scheme !== 'default') {
      html.classList.add(`scheme-${scheme}`);
    }
  }

  private listenToSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      if (this.preferencesSubject.value.theme === 'system') {
        this.applyTheme('system');
      }
    });
  }

  // Analytics and insights
  getUsageStats(): Record<string, unknown> {
    const preferences = this.currentPreferences;
    return {
      themeUsage: preferences.theme,
      featuresEnabled: {
        compactMode: preferences.compactMode,
        animations: preferences.animations,
        developerMode: preferences.developerMode,
        debugMode: preferences.debugMode,
        experimentalFeatures: preferences.experimentalFeatures
      },
      accessibility: {
        highContrast: preferences.highContrast,
        reducedMotion: preferences.reducedMotion,
        screenReader: preferences.screenReader,
        keyboardNavigation: preferences.keyboardNavigation
      },
      dataUsage: {
        autoRefreshInterval: preferences.autoRefreshInterval,
        defaultPageSize: preferences.defaultPageSize,
        savedSearchesCount: preferences.savedSearches.length,
        favoriteFiltersCount: preferences.favoriteFilters.length
      }
    };
  }
}
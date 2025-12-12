import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  appName: string;
  version: string;
  features: {
    enableMockData: boolean;
    enableAnalytics: boolean;
    enableDebugMode: boolean;
  };
  auth: {
    enableAuth: boolean;
    tokenKey: string;
    keycloak?: {
      url: string;
      realm: string;
      clientId: string;
      initOptions: {
        onLoad: 'login-required' | 'check-sso';
        checkLoginIframe: boolean;
        pkceMethod: 'S256';
      };
      bearerExcludedUrls: string[];
    };
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  private configLoaded = false;

  // Default configuration as fallback
  private defaultConfig: AppConfig = {
    production: false,
    apiUrl: 'http://localhost:3000',
    appName: 'EDC Dataspace Dashboard',
    version: '1.0.0',
    features: {
      enableMockData: true,
      enableAnalytics: false,
      enableDebugMode: true
    },
    auth: {
      enableAuth: false,
      tokenKey: 'edc-public-dashboard-token'
    },
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 100
    }
  };

  loadConfig(): Observable<AppConfig> {
    if (this.configLoaded && this.configSubject.value) {
      return of(this.configSubject.value);
    }

    return this.http.get<AppConfig>('./assets/config/config.json').pipe(
      tap(config => {
        this.configSubject.next(config);
        this.configLoaded = true;
      }),
      catchError(() => {
        this.configSubject.next(this.defaultConfig);
        this.configLoaded = true;
        return of(this.defaultConfig);
      })
    );
  }

  get config(): AppConfig | null {
    return this.configSubject.value;
  }

  get config$(): Observable<AppConfig | null> {
    return this.configSubject.asObservable();
  }

  getValue<K extends keyof AppConfig>(key: K): AppConfig[K] | null {
    const config = this.config;
    return config ? config[key] : null;
  }

  getNestedValue<T>(path: string): T | null {
    const config = this.config;
    if (!config) return null;

    const keys = path.split('.');
    let value: unknown = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && value !== null && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return null;
      }
    }

    return value as T;
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.getNestedValue<boolean>(`features.${feature}`) ?? false;
  }

  getApiUrl(): string {
    return this.getValue('apiUrl') ?? this.defaultConfig.apiUrl;
  }

  isProduction(): boolean {
    return this.getValue('production') ?? false;
  }

  getVersion(): string {
    return this.getValue('version') ?? this.defaultConfig.version;
  }

  getAppName(): string {
    return this.getValue('appName') ?? this.defaultConfig.appName;
  }
}

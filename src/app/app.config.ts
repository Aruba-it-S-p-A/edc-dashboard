import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakInitOptions } from 'keycloak-js';

import { routes } from './app.routes';
import { ConfigService } from './core/services/config.service';
import { AuthService } from './core/services/auth.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Custom loader for translations
export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`./assets/i18n/${lang}.json`);
  }
}

// Factory function for CustomTranslateLoader
export function HttpLoaderFactory(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

// Factory function for ConfigService initialization
export function configFactory(configService: ConfigService) {
  return () => configService.loadConfig().toPromise();
}

// Factory function for Keycloak initialization
export function keycloakFactory(keycloak: KeycloakService, configService: ConfigService, authService: AuthService) {
  return () => {
    return configService.loadConfig().toPromise().then(config => {
      if (config?.auth?.enableAuth && config.auth.keycloak) {
        const keycloakConfig = config.auth.keycloak;
        
        return keycloak.init({
          config: {
            url: keycloakConfig.url,
            realm: keycloakConfig.realm,
            clientId: keycloakConfig.clientId
          },
          initOptions: {
            ...keycloakConfig.initOptions,
            checkLoginIframe: false,
          } as KeycloakInitOptions,
          bearerExcludedUrls: keycloakConfig.bearerExcludedUrls
        }).then(() => {
          return authService.initializeAuth().then(() => true);
        }).catch(() => false);
      } else {
        return true;
      }
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    ConfigService,
    AuthService,
    KeycloakService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideAppInitializer(() => {
        const initializerFn = (configFactory)(inject(ConfigService));
        return initializerFn();
      }),
    provideAppInitializer(() => {
        const initializerFn = (keycloakFactory)(inject(KeycloakService), inject(ConfigService), inject(AuthService));
        return initializerFn();
      }),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        defaultLanguage: 'it',
        useDefaultLang: true
      })
    )
  ]
};

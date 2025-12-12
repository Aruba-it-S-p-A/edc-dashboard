import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { KeycloakService } from 'keycloak-angular';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private keycloakService = inject(KeycloakService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if authentication is enabled
    if (!this.authService.isAuthEnabled()) {
      return next.handle(request);
    }

    // Check if the request should be excluded from authentication
    const keycloakConfig = this.authService.getKeycloakConfig() as { bearerExcludedUrls?: string[] } | null;
    const excludedUrls = keycloakConfig?.bearerExcludedUrls || [];
    
    if (this.isExcludedUrl(request.url, excludedUrls)) {
      return next.handle(request);
    }

    // Add authorization header if user is authenticated
    const isLoggedIn = this.keycloakService.isLoggedIn();
    return of(isLoggedIn).pipe(
      switchMap(isLoggedIn => {
        if (isLoggedIn) {
          const token = this.authService.getToken();
          if (token) {
            const authRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return next.handle(authRequest);
          }
        }
        return next.handle(request);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token might be expired, try to refresh
          return this.handleTokenRefresh(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private isExcludedUrl(url: string, excludedUrls: string[]): boolean {
    return excludedUrls.some(excludedUrl => {
      if (excludedUrl.startsWith('/')) {
        return url.includes(excludedUrl);
      } else {
        return url === excludedUrl;
      }
    });
  }

  private handleTokenRefresh(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // KeycloakPromise is not compatible with Promise, need to cast through unknown
    const tokenPromise = this.keycloakService.getKeycloakInstance().updateToken(30) as unknown as Promise<boolean>;
    return from(tokenPromise).pipe(
      switchMap(refreshed => {
        if (refreshed) {
          // Token refreshed successfully, retry the request with new token
          const token = this.authService.getToken();
          if (token) {
            const authRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return next.handle(authRequest);
          }
        }
        
        // Token refresh failed or no token available, redirect to login
        this.keycloakService.login();
        return throwError(() => new Error('Authentication failed'));
      }),
      catchError(error => {
        this.keycloakService.login();
        return throwError(() => error);
      })
    );
  }
}

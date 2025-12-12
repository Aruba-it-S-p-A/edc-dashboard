import { Injectable, inject, OnDestroy } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { stopTokenRefresh } from '../init/keycloak-init.factory';

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  token?: string;
  tokenParsed?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private keycloakService = inject(KeycloakService);
  private configService = inject(ConfigService);
  
  private userSubject = new BehaviorSubject<UserInfo | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isCheckingAuth = false;
  private isLoadingUser = false;

  constructor() {}

  async initializeAuth(): Promise<void> {
    try {
      await this.waitForKeycloak();
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.checkAuthState();
    } catch (error) {
      this.isAuthenticatedSubject.next(false);
      this.userSubject.next(null);
    }
  }

  private async waitForKeycloak(): Promise<void> {
    const maxAttempts = 100; // Increased attempts
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const instance = this.keycloakService.getKeycloakInstance();
        if (instance && instance.authenticated !== undefined) {
          return;
        }
      } catch {
        // Keycloak not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay
      attempts++;
    }
    throw new Error('Keycloak initialization timeout after 5 seconds');
  }

  private async checkAuthState(): Promise<void> {
    if (this.isCheckingAuth) return;
    
    this.isCheckingAuth = true;
    
    try {
      const isLoggedIn = this.keycloakService.isLoggedIn();
      
      if (isLoggedIn !== this.isAuthenticatedSubject.value) {
        this.isAuthenticatedSubject.next(isLoggedIn);
        
        if (isLoggedIn) {
          await this.loadUserInfo();
        } else {
          this.userSubject.next(null);
        }
      }
    } catch {
      this.isAuthenticatedSubject.next(false);
      this.userSubject.next(null);
    } finally {
      this.isCheckingAuth = false;
    }
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  getCurrentUser(): Observable<UserInfo | null> {
    return this.userSubject.asObservable();
  }

  getCurrentUserSync(): UserInfo | null {
    return this.userSubject.value;
  }

  isAuthenticatedSync(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    try {
      return this.keycloakService.getKeycloakInstance().token || null;
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return this.keycloakService.getKeycloakInstance().refreshToken || null;
    } catch {
      return null;
    }
  }

  login(): Observable<boolean> {
    return from(this.keycloakService.login()).pipe(
      switchMap(() => this.waitForAuthCompletion()),
      catchError(() => of(false))
    );
  }

  private waitForAuthCompletion(): Observable<boolean> {
    return new Observable(observer => {
      const checkAuth = async () => {
        try {
          await this.waitForKeycloak();
          await this.checkAuthState();
          observer.next(this.isAuthenticatedSync());
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      };
      
      setTimeout(checkAuth, 100);
    });
  }


  hasRole(role: string): boolean {
    try {
      return this.keycloakService.isUserInRole(role);
    } catch {
      return false;
    }
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  hasAllRoles(roles: string[]): boolean {
    return roles.every(role => this.hasRole(role));
  }

  getUserRoles(): string[] {
    try {
      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed;
      if (tokenParsed && tokenParsed.realm_access && tokenParsed.realm_access.roles) {
        return tokenParsed.realm_access.roles;
      }
      return [];
    } catch {
      return [];
    }
  }

  refreshToken(): Observable<boolean> {
    // KeycloakPromise is not compatible with Promise, need to cast through unknown
    const tokenPromise = this.keycloakService.getKeycloakInstance().updateToken(30) as unknown as Promise<boolean>;
    return from(tokenPromise).pipe(
      switchMap((refreshed: boolean) => {
        if (refreshed) {
          return from(this.loadUserInfo()).pipe(map(() => true));
        }
        return of(false);
      }),
      catchError(() => this.logout().pipe(map(() => false)))
    );
  }

  private async loadUserInfo(): Promise<void> {
    if (this.isLoadingUser) return;
    
    if (!this.keycloakService.isLoggedIn()) {
      this.userSubject.next(null);
      return;
    }

    this.isLoadingUser = true;
    
    try {
      const profile = await this.keycloakService.loadUserProfile();
      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed;
      const roles = this.getUserRoles();
      
      const userInfo: UserInfo = {
        id: profile.id || '',
        username: profile.username || '',
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        roles: roles,
        token: this.getToken() || undefined,
        tokenParsed: tokenParsed
      };

      this.userSubject.next(userInfo);
    } catch {
      this.userSubject.next(null);
    } finally {
      this.isLoadingUser = false;
    }
  }

  getUserDisplayName(): string {
    const user = this.getCurrentUserSync();
    if (!user) return '';

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.username) {
      return user.username;
    }

    return 'User';
  }

  isAuthEnabled(): boolean {
    return this.configService.getNestedValue<boolean>('auth.enableAuth') ?? false;
  }

  getKeycloakConfig() {
    return this.configService.getNestedValue('auth.keycloak');
  }

  logout(): Observable<boolean> {
    stopTokenRefresh();
    
    this.userSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    const redirectUrl = `${window.location.origin}/admin/`;

    return from(this.keycloakService.logout(redirectUrl)).pipe(
      map(() => {
        return true;
      }),
      catchError(() => {
        window.location.href = '/';
        return of(false);
      })
    );
  }

  ngOnDestroy(): void {
    this.userSubject.complete();
    this.isAuthenticatedSubject.complete();
  }
}
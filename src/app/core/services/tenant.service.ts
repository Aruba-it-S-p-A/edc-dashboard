import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { BrandingUtilityService } from './branding-utility.service';

export interface TenantBranding {
  logo?: string;
  logoType?: 'base64' | 'url';
  cardColor?: string;
  sidenavColor?: string;
  headerColor?: string;
  textColor?: string;
  backgroundColor?: string;
  primaryColor?: string;
  primaryColorHover?: string;
}

export interface TenantInfo {
  name: string;
  description: string;
  metadata: {
    organizationName: string;
    industry: string;
    contactName: string;
    email: string;
    phone: string;
    role: string;
    region: string;
    environment: string;
    createdAt: string;
    brand?: TenantBranding;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private brandingUtility = inject(BrandingUtilityService);
  
  private tenantInfo$ = new BehaviorSubject<TenantInfo | null>(null);
  private branding$ = new BehaviorSubject<TenantBranding | null>(null);
  private readonly BRANDING_STORAGE_KEY = 'edc-public-dashboard-branding';

  constructor() {
    this.loadTenantInfo();
    this.loadBrandingFromStorage();
  }

  loadTenantInfo(): void {
    const apiUrl = this.configService.getApiUrl();
    
    this.http.get<TenantInfo>(`${apiUrl}/v1/tenants/me`).pipe(
      tap(tenantInfo => {
        this.tenantInfo$.next(tenantInfo);
        
        if (tenantInfo.metadata?.brand) {
          this.branding$.next(tenantInfo.metadata.brand);
          this.applyBranding(tenantInfo.metadata.brand);
          this.saveBrandingToStorage(tenantInfo.metadata.brand);
        } else {
          const storedBranding = this.loadBrandingFromStorage();
          if (storedBranding) {
            this.branding$.next(storedBranding);
            this.applyBranding(storedBranding);
          } else {
            this.branding$.next(null);
          }
        }
      }),
      catchError(() => {
        const storedBranding = this.loadBrandingFromStorage();
        if (storedBranding) {
          this.branding$.next(storedBranding);
          this.applyBranding(storedBranding);
        }
        return of(null);
      })
    ).subscribe();
  }

  private loadBrandingFromStorage(): TenantBranding | null {
    try {
      const stored = localStorage.getItem(this.BRANDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveBrandingToStorage(branding: TenantBranding): void {
    try {
      localStorage.setItem(this.BRANDING_STORAGE_KEY, JSON.stringify(branding));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  private applyBranding(branding: TenantBranding): void {
    this.brandingUtility.applyBrandingToDOM(branding);
  }

  getTenantInfo(): Observable<TenantInfo | null> {
    return this.tenantInfo$.asObservable();
  }

  getBranding(): Observable<TenantBranding | null> {
    return this.branding$.asObservable();
  }

  updateTenantBranding(tenantId: string, branding: TenantBranding): Observable<any> {
    const apiUrl = this.configService.getApiUrl();
    
    this.branding$.next({ ...branding });
    this.applyBranding(branding);
    this.saveBrandingToStorage(branding);
    
    return this.http.put(`${apiUrl}/v1/tenants/${tenantId}`, {
      metadata: {
        brand: branding
      }
    }).pipe(
      tap(() => {
        this.loadTenantInfo();
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  updateBrandingLocal(branding: TenantBranding): void {
    this.branding$.next({ ...branding });
    this.applyBranding(branding);
    this.saveBrandingToStorage(branding);
  }

  resetToDefaultBranding(tenantId: string): Observable<any> {
    const defaultBranding = this.brandingUtility.getDefaultBranding();
    return this.updateTenantBranding(tenantId, defaultBranding);
  }
}

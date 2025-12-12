import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { UserPreferencesService } from './core/services/user-preferences.service';
import { LogoService, LogoConfig } from './core/services/logo.service';
import { AuthService } from './core/services/auth.service';
import { ConfigService } from './core/services/config.service';
import { TenantService } from './core/services/tenant.service';
import { ThemeService } from './core/services/theme.service';
import { ModalComponent } from './shared/components/modal/modal.component';
import { AuthButtonComponent } from './shared/components/auth/auth-button.component';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ModalComponent, AuthButtonComponent, TranslateModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    animations: [
        trigger('slideIn', [
            state('in', style({ transform: 'translateX(0)' })),
            state('out', style({ transform: 'translateX(-100%)' })),
            transition('in => out', animate('300ms ease-in-out')),
            transition('out => in', animate('300ms ease-in-out'))
        ])
    ]
})
export class AppComponent implements OnInit {
  private translateService = inject(TranslateService);
  private preferencesService = inject(UserPreferencesService);
  private logoService = inject(LogoService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private tenantService = inject(TenantService);
  public themeService = inject(ThemeService);
  
  title = 'Dataspace Platform';
  logo$!: Observable<LogoConfig>;
  tenantLogo$!: Observable<string | null>;
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  isNotificationsOpen = false;
  
  // Check if user has admin role
  hasAdminRole$!: Observable<boolean>;
  showUnauthorized$!: Observable<boolean>;
  requiredRole!: string;

  ngOnInit(): void {
    this.logo$ = this.logoService.logo$;
    this.tenantLogo$ = this.tenantService.getBranding().pipe(
      map(branding => branding?.logo || null)
    );
    
    const defaultLanguage = this.configService.getNestedValue<string>('i18n.defaultLanguage') || 'en';
    this.translateService.setDefaultLang(defaultLanguage);
    
    this.initializeLanguage();
    
    this.preferencesService.preferences$.subscribe(prefs => {
      this.translateService.use(prefs.language);
    });
    
    this.tenantService.loadTenantInfo();
    
    this.requiredRole = this.configService.getNestedValue<string>('auth.requiredRole') || 'EDC_ADMIN';
    
    this.setupUserPreferences();
    this.setupRoleCheck();
    
    this.tenantService.loadTenantInfo();
    
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        this.isUserMenuOpen = false;
        this.isNotificationsOpen = false;
      }
    });
  }

  private initializeLanguage(): void {
    const defaultLanguage = this.configService.getNestedValue<string>('i18n.defaultLanguage') || 'en';
    const currentPreferences = this.preferencesService.currentPreferences;
    
    this.authService.isAuthenticated().subscribe((isAuthenticated: boolean) => {
      if (isAuthenticated) {
        const savedLanguage = currentPreferences.language || defaultLanguage;
        this.translateService.use(savedLanguage);
      } else {
        this.translateService.use(defaultLanguage);
      }
    });
  }

  private setupUserPreferences(): void {
    this.authService.isAuthenticated().subscribe((isAuthenticated: boolean) => {
      if (isAuthenticated) {
        this.authService.getCurrentUser().subscribe((userInfo) => {
          if (userInfo) {
            this.preferencesService.setCurrentUser(userInfo.id);
          }
        });
      } else {
        this.preferencesService.setCurrentUser(null);
      }
    });
  }

  private setupRoleCheck(): void {
    const isAuthEnabled = this.authService.isAuthEnabled();
    
    this.hasAdminRole$ = combineLatest([
      this.authService.isAuthenticated(),
      this.authService.getCurrentUser()
    ]).pipe(
      map(([isAuthenticated, user]) => {
        if (!isAuthEnabled) {
          return true;
        }
        if (!isAuthenticated || !user) {
          return false;
        }
        return this.authService.hasRole(this.requiredRole);
      })
    );

    this.showUnauthorized$ = combineLatest([
      this.hasAdminRole$,
      this.authService.isAuthenticated()
    ]).pipe(
      map(([hasAdminRole, isAuthenticated]) => {
        if (!isAuthEnabled) {
          return false;
        }
        return isAuthenticated && !hasAdminRole;
      })
    );
  }


  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Prevent body scroll when mobile menu is open
    document.body.classList.toggle('overflow-hidden', this.isMobileMenuOpen);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotificationsOpen = false; // Close other dropdowns
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isUserMenuOpen = false; // Close other dropdowns
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.classList.remove('overflow-hidden');
  }

  logout(): void {

    this.authService.logout().subscribe();
  }
}
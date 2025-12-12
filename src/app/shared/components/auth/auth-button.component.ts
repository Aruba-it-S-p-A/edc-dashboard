import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService, UserInfo } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-button',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    @if (isLoading) {
      <!-- Loading state -->
      <div class="flex items-center space-x-2">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ 'common.loading' | translate }}</span>
      </div>
    } @else if (isAuthenticated) {
      <!-- User is authenticated -->
      <div class="flex items-center space-x-4">
        <!-- User info -->
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-medium">
              {{ getUserInitials() }}
            </span>
          </div>
          <div class="hidden md:block">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ userDisplayName }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ userEmail }}
            </p>
          </div>
        </div>

        <!-- Dropdown menu -->
        <div class="relative" #dropdown>
          <button
            type="button"
            (click)="toggleDropdown()"
            class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            [attr.aria-expanded]="isDropdownOpen"
            aria-haspopup="true"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          @if (isDropdownOpen) {
            <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
              <!-- User details -->
              <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ userDisplayName }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ userEmail }}</p>
              </div>

              <!-- Roles -->
              @if (userRoles.length > 0) {
                <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{{ 'auth.roles' | translate }}</p>
                  <div class="mt-1 flex flex-wrap gap-1">
                    @for (role of userRoles; track role) {
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                        {{ role }}
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Actions -->
              <div class="py-1">
                <button
                  (click)="logout()"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    {{ 'auth.logout' | translate }}
                  </div>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    } @else {
      <!-- User is not authenticated -->
      <button
        (click)="login()"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
        </svg>
        {{ 'auth.login' | translate }}
      </button>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AuthButtonComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  isAuthenticated = false;
  currentUser: UserInfo | null = null;
  isDropdownOpen = false;
  isLoading = true;

  get userDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  get userEmail(): string {
    return this.currentUser?.email || '';
  }

  get userRoles(): string[] {
    return this.currentUser?.roles || [];
  }

  ngOnInit(): void {
    const initialAuthState = this.authService.isAuthenticatedSync();
    const initialUser = this.authService.getCurrentUserSync();
    
    this.isAuthenticated = initialAuthState;
    this.currentUser = initialUser;
    
    if (initialAuthState !== null && initialUser !== null) {
      this.isLoading = false;
    }
    
    this.authService.isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        
        if (!isAuthenticated) {
          this.currentUser = null;
          this.isLoading = false;
        }
      });

    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        
        if (user) {
          this.isLoading = false;
        }
      });

    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
      }
    }, 1000);
    
    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login(): void {
    this.authService.login().subscribe({
      next: (success) => {
        if (success) {
          const returnUrl = localStorage.getItem('returnUrl') || '/dashboard';
          localStorage.removeItem('returnUrl');
          this.router.navigate([returnUrl]);
        }
      }
    });
  }

  logout(): void {
    this.authService.logout()
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';

    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    const username = this.currentUser.username || '';

    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (username) {
      return username.charAt(0).toUpperCase();
    }

    return 'U';
  }
}

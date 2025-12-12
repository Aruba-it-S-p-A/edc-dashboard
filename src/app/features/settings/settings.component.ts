
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { ModalService } from '../../core/services/modal.service';
import { TenantService, TenantBranding } from '../../core/services/tenant.service';
import { BrandingUtilityService } from '../../core/services/branding-utility.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
    selector: 'app-settings',
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  private preferencesService = inject(UserPreferencesService);
  private modalService = inject(ModalService);
  private translateService = inject(TranslateService);
  private tenantService = inject(TenantService);
  private brandingUtility = inject(BrandingUtilityService);

  preferences$: Observable<UserPreferences>;
  branding$: Observable<TenantBranding | null>;
  tenantInfo$: Observable<any>;
  currentBranding: TenantBranding | null = null;
  usageStats: any;
  activeTab = 'appearance';
  isUpdatingBranding = false;
  pendingBrandingChanges: Partial<TenantBranding> = {};
  hasPendingChanges = false;
  isUploadingLogo = false;

  settingsTabs = [
    { id: 'appearance', label: 'Appearance', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"></path></svg>' },
    { id: 'branding', label: 'Branding', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>' },
    { id: 'dashboard', label: 'Dashboard', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>' },
    { id: 'advanced', label: 'Advanced', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>' },
    { id: 'accessibility', label: 'Accessibility', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>' },
    { id: 'data', label: 'Data', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>' }
  ];

  constructor() {
    this.preferences$ = this.preferencesService.preferences$;
    this.branding$ = this.tenantService.getBranding();
    this.tenantInfo$ = this.tenantService.getTenantInfo();
    
    this.branding$.subscribe(branding => {
      this.currentBranding = branding;
    });
  }

  ngOnInit(): void {
    this.loadUsageStats();
  }

  private loadUsageStats(): void {
    this.usageStats = this.preferencesService.getUsageStats();
  }

  updatePreference(key: keyof UserPreferences, value: string | number | boolean): void {
    this.preferencesService.updatePreferences({ [key]: value });
    this.loadUsageStats(); // Refresh stats
    
  }

  exportSettings(): void {
    const settings = this.preferencesService.exportPreferences();
    const blob = new Blob([settings], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edc-public-dashboard-settings.json';
    link.click();
    window.URL.revokeObjectURL(url);

    this.modalService.alert({
      title: 'Settings Exported',
      message: 'Your settings have been exported successfully.',
      confirmText: 'OK'
    });
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (this.preferencesService.importPreferences(content)) {
            this.modalService.alert({
              title: 'Settings Imported',
              message: 'Your settings have been imported successfully.',
              confirmText: 'OK'
            });
            this.loadUsageStats();
          } else {
            throw new Error('Invalid settings file');
          }
        } catch (error) {
          this.modalService.alert({
            title: 'Import Failed',
            message: 'The settings file is invalid or corrupted.',
            confirmText: 'OK'
          });
        }
      };
      reader.readAsText(file);
    }
  }

  async resetSettings(): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Reset All Settings',
      message: 'Are you sure you want to reset all settings to their default values? This action cannot be undone.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      size: 'md'
    });

    if (confirmed) {
      this.preferencesService.resetPreferences();
      this.loadUsageStats();
      this.modalService.alert({
        title: 'Settings Reset',
        message: 'All settings have been reset to their default values.',
        confirmText: 'OK'
      });
    }
  }

  getEnabledFeatures(): string[] {
    if (!this.usageStats) return [];
    
    const features: string[] = [];
    Object.entries(this.usageStats.featuresEnabled).forEach(([key, value]) => {
      if (value) features.push(key);
    });
    Object.entries(this.usageStats.accessibility).forEach(([key, value]) => {
      if (value) features.push(key);
    });
    
    return features;
  }

  getSupportedLanguages() {
    return [
      { code: 'it', name: 'Italiano' },
      { code: 'en', name: 'English' }
    ];
  }

  formatFeatureName(feature: string): string {
    return feature.replace(/([A-Z])/g, ' $1').trim();
  }

  showKeyboardShortcuts(): void {
    this.modalService.alert({
      title: 'Keyboard Shortcuts',
      message: `
        <div class="text-left space-y-2 text-sm">
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + /</kbd> - Toggle search</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + K</kbd> - Quick actions</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + \\</kbd> - Toggle sidebar</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + Shift + D</kbd> - Toggle dark mode</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Esc</kbd> - Close modals</div>
        </div>
      `,
      isHtml: true,
      confirmText: 'Got it'
    });
  }

  updateBrandingColor(colorType: 'backgroundColor' | 'headerColor' | 'sidenavColor' | 'cardColor' | 'textColor' | 'primaryColor' | 'primaryColorHover', value: string): void {
    if (!value) return;
    
    this.pendingBrandingChanges[colorType] = value;
    this.hasPendingChanges = true;
  }

  saveBrandingChanges(): void {
    if (!this.hasPendingChanges) return;

    // Check if only logo is being modified
    const logoChanged = this.pendingBrandingChanges.logo !== undefined;
    const colorChanges = Object.keys(this.pendingBrandingChanges).filter(key => 
      key !== 'logo' && key !== 'logoType'
    );

    let message = '';
    if (logoChanged && colorChanges.length === 0) {
      message = 'Are you sure you want to modify the logo?';
    } else if (logoChanged && colorChanges.length > 0) {
      const changesList = colorChanges
        .map(key => `${this.getColorLabel(key as keyof TenantBranding)}: ${this.pendingBrandingChanges[key as keyof TenantBranding]}`)
        .join(', ');
      message = `Are you sure you want to apply the following changes?\n\nLogo modification\n${changesList}`;
    } else {
      const changesList = colorChanges
        .map(key => `${this.getColorLabel(key as keyof TenantBranding)}: ${this.pendingBrandingChanges[key as keyof TenantBranding]}`)
        .join(', ');
      message = `Are you sure you want to apply the following changes?\n\n${changesList}`;
    }

    this.modalService.confirm({
      title: 'Confirm Branding Changes',
      message: message,
      confirmText: 'Save',
      cancelText: 'Cancel'
    }).then(confirmed => {
      if (confirmed) {
        this.applyBrandingChanges();
      }
    });
  }

  cancelBrandingChanges(): void {
    this.pendingBrandingChanges = {};
    this.hasPendingChanges = false;
    
    if (this.currentBranding) {
      this.tenantService.updateBrandingLocal(this.currentBranding);
    }
  }

  private applyBrandingChanges(): void {
    this.tenantInfo$.pipe(
      take(1)
    ).subscribe(tenantInfo => {
      this.isUpdatingBranding = true;
      
      const completeBranding: TenantBranding = {
        backgroundColor: this.pendingBrandingChanges.backgroundColor ?? this.currentBranding?.backgroundColor ?? '#0f172a',
        headerColor: this.pendingBrandingChanges.headerColor ?? this.currentBranding?.headerColor ?? '#1f2937',
        sidenavColor: this.pendingBrandingChanges.sidenavColor ?? this.currentBranding?.sidenavColor ?? '#1f2937',
        cardColor: this.pendingBrandingChanges.cardColor ?? this.currentBranding?.cardColor ?? '#1f2937',
        textColor: this.pendingBrandingChanges.textColor ?? this.currentBranding?.textColor ?? '#f9fafb',
        primaryColor: this.pendingBrandingChanges.primaryColor ?? this.currentBranding?.primaryColor ?? '#3b82f6',
        primaryColorHover: this.pendingBrandingChanges.primaryColorHover ?? this.currentBranding?.primaryColorHover ?? '#2563eb',
        logo: this.pendingBrandingChanges.logo ?? this.currentBranding?.logo ?? '',
        logoType: this.pendingBrandingChanges.logoType ?? this.currentBranding?.logoType ?? 'base64'
      };
      
      if (tenantInfo?.id) {
        this.tenantService.updateTenantBranding(tenantInfo.id, completeBranding).subscribe({
          next: () => {
            this.currentBranding = completeBranding;
            this.modalService.alert({
              title: 'Success',
              message: 'Branding updated successfully',
              confirmText: 'OK'
            });
            this.pendingBrandingChanges = {};
            this.hasPendingChanges = false;
            this.isUpdatingBranding = false;
          },
          error: (error) => {
            this.tenantService.updateBrandingLocal(completeBranding);
            this.currentBranding = completeBranding;
            this.modalService.alert({
              title: 'Warning',
              message: 'Branding applied locally but failed to save to server. Changes are saved in browser storage.',
              confirmText: 'OK'
            });
            this.pendingBrandingChanges = {};
            this.hasPendingChanges = false;
            this.isUpdatingBranding = false;
          }
        });
      } else {
        this.tenantService.updateBrandingLocal(completeBranding);
        this.currentBranding = completeBranding;
        this.modalService.alert({
          title: 'Success',
          message: 'Branding applied locally. Changes are saved in browser storage.',
          confirmText: 'OK'
        });
        this.pendingBrandingChanges = {};
        this.hasPendingChanges = false;
        this.isUpdatingBranding = false;
      }
    });
  }

  private getColorLabel(colorType: keyof TenantBranding): string {
    const labels: Record<keyof TenantBranding, string> = {
      backgroundColor: 'Background Color',
      headerColor: 'Header Color',
      sidenavColor: 'Sidebar Color',
      cardColor: 'Card Color',
      textColor: 'Text Color',
      primaryColor: 'Primary Color',
      primaryColorHover: 'Primary Color Hover',
      logo: 'Logo',
      logoType: 'Logo Type'
    };
    return labels[colorType] || colorType;
  }

  resetBrandingToDefault(): void {
    this.modalService.confirm({
      title: 'Reset Branding',
      message: 'Are you sure you want to reset all branding colors to default? This action cannot be undone.',
      confirmText: 'Reset',
      cancelText: 'Cancel'
    }).then(confirmed => {
      if (confirmed) {
        this.tenantInfo$.pipe(
          take(1)
        ).subscribe(tenantInfo => {
          this.isUpdatingBranding = true;
          
          const defaultBranding = this.brandingUtility.getDefaultBranding();
          
          if (tenantInfo?.id) {
            this.tenantService.updateTenantBranding(tenantInfo.id, defaultBranding).subscribe({
              next: () => {
                this.currentBranding = defaultBranding;
                this.modalService.alert({
                  title: 'Success',
                  message: 'Branding reset to default successfully',
                  confirmText: 'OK'
                });
                this.pendingBrandingChanges = {};
                this.hasPendingChanges = false;
                this.isUpdatingBranding = false;
              },
              error: (error) => {
                this.tenantService.updateBrandingLocal(defaultBranding);
                this.currentBranding = defaultBranding;
                this.modalService.alert({
                  title: 'Warning',
                  message: 'Branding reset locally but failed to save to server. Changes are saved in browser storage.',
                  confirmText: 'OK'
                });
                this.pendingBrandingChanges = {};
                this.hasPendingChanges = false;
                this.isUpdatingBranding = false;
              }
            });
          } else {
            this.tenantService.updateBrandingLocal(defaultBranding);
            this.currentBranding = defaultBranding;
            this.modalService.alert({
              title: 'Success',
              message: 'Branding reset to default. Changes are saved in browser storage.',
              confirmText: 'OK'
            });
            this.pendingBrandingChanges = {};
            this.hasPendingChanges = false;
            this.isUpdatingBranding = false;
          }
        });
      }
    });
  }

  onLogoFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.modalService.alert({
        title: 'Invalid File',
        message: 'Please select an image file',
        confirmText: 'OK'
      });
      return;
    }

    if (file.size > 500 * 1024) {
      this.modalService.alert({
        title: 'File Too Large',
        message: 'Please select an image smaller than 500KB',
        confirmText: 'OK'
      });
      return;
    }

    this.isUploadingLogo = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.pendingBrandingChanges.logo = result;
      this.pendingBrandingChanges.logoType = 'base64';
      this.hasPendingChanges = true;
      this.isUploadingLogo = false;
    };
    reader.readAsDataURL(file);
  }

  getBrandingValue(key: keyof TenantBranding, defaultValue: string): string {
    // if we have pending changes, use them
    if (this.pendingBrandingChanges[key]) {
      return this.pendingBrandingChanges[key] as string;
    }
    
    // if we have current branding, use it
    if (this.currentBranding && this.currentBranding[key]) {
      return this.currentBranding[key] as string;
    }
    
    // otherwise use the default value
    return defaultValue;
  }

  hasBrandingValue(key: keyof TenantBranding): boolean {
    // if we have pending changes, use them
    if (this.pendingBrandingChanges[key]) {
      return !!(this.pendingBrandingChanges[key]);
    }
    
    // if we have current branding, use it
    if (this.currentBranding && this.currentBranding[key]) {
      return !!(this.currentBranding[key]);
    }
    
    // otherwise use the default value
    const defaultValue = this.getDefaultBrandingValue(key);
    return !!defaultValue;
  }

  private getDefaultBrandingValue(key: keyof TenantBranding): string {
    switch (key) {
      case 'logo':
        return '';
      case 'logoType':
        return 'base64';
      case 'cardColor':
        return '#1f2937';
      case 'textColor':
        return '#f9fafb';
      case 'headerColor':
        return '#1f2937';
      case 'sidenavColor':
        return '#1f2937';
      case 'backgroundColor':
        return '#0f172a';
      default:
        return '';
    }
  }

  removeLogo(): void {
    this.pendingBrandingChanges.logo = '';
    this.pendingBrandingChanges.logoType = 'base64';
    this.hasPendingChanges = true;
  }
}
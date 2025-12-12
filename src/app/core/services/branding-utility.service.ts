import { Injectable } from '@angular/core';
import { TenantBranding } from './tenant.service';

export interface ColorVariants {
  '50': string;
  '100': string;
  '200': string;
  '300': string;
  '400': string;
  '500': string;
  '600': string;
  '700': string;
  '800': string;
  '900': string;
}

@Injectable({
  providedIn: 'root'
})
export class BrandingUtilityService {

  applyBrandingToDOM(branding: TenantBranding): void {
    if (!branding) return;

    const root = document.documentElement;
    
    // Apply basic branding colors
    if (branding.backgroundColor) {
      root.style.setProperty('--tenant-background', branding.backgroundColor);
    }
    if (branding.headerColor) {
      root.style.setProperty('--tenant-header', branding.headerColor);
    }
    if (branding.sidenavColor) {
      root.style.setProperty('--tenant-sidenav', branding.sidenavColor);
    }
    if (branding.cardColor) {
      root.style.setProperty('--tenant-card', branding.cardColor);
    }
    if (branding.textColor) {
      root.style.setProperty('--tenant-text', branding.textColor);
    }

    // Apply primary colors for buttons and interactive elements
    if (branding.primaryColor) {
      const colorVariants = this.generateColorVariants(branding.primaryColor, branding.primaryColorHover);
      
      // Apply all color variants to CSS variables
      Object.entries(colorVariants).forEach(([shade, color]) => {
        root.style.setProperty(`--color-primary-${shade}`, color);
      });
    }
    
    // Apply logo if present
    if (branding.logo) {
      this.applyLogoToDOM(branding);
    }
  }

  applyLogoToDOM(branding: TenantBranding): void {
    if (!branding.logo) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = '/favicon.ico';
      }
      return;
    }

    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = branding.logo;
    }
  }

  generateColorVariants(baseColor: string, hoverColor?: string): ColorVariants {
    const primaryColor = baseColor;
    const primaryColorHover = hoverColor || baseColor;

    return {
      '50': this.lightenColor(primaryColor, 0.9),
      '100': this.lightenColor(primaryColor, 0.8),
      '200': this.lightenColor(primaryColor, 0.6),
      '300': this.lightenColor(primaryColor, 0.4),
      '400': this.lightenColor(primaryColor, 0.2),
      '500': primaryColor,
      '600': primaryColorHover,
      '700': this.darkenColor(primaryColor, 0.2),
      '800': this.darkenColor(primaryColor, 0.4),
      '900': this.darkenColor(primaryColor, 0.6)
    };
  }

  lightenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
    const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
    const newB = Math.min(255, Math.floor(b + (255 - b) * amount));

    return `rgb(${newR} ${newG} ${newB})`;
  }

  darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const newR = Math.max(0, Math.floor(r * (1 - amount)));
    const newG = Math.max(0, Math.floor(g * (1 - amount)));
    const newB = Math.max(0, Math.floor(b * (1 - amount)));

    return `rgb(${newR} ${newG} ${newB})`;
  }

  getDefaultBranding(): TenantBranding {
    return {
      backgroundColor: '#0f172a',
      headerColor: '#1f2937',
      sidenavColor: '#1f2937',
      cardColor: '#1f2937',
      textColor: '#f9fafb',
      primaryColor: '#3b82f6',
      primaryColorHover: '#2563eb',
      logo: '',
      logoType: 'base64'
    };
  }

  isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }
}

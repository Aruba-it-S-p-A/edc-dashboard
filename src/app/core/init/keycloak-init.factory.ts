import { KeycloakService } from 'keycloak-angular';
import { KeycloakInitOptions } from 'keycloak-js';
import { ConfigService } from '../services/config.service';

let refreshInterval: ReturnType<typeof setInterval> | null = null;

export function stopTokenRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

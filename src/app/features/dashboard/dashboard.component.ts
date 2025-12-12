import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, combineLatest, map, interval, startWith, switchMap, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ParticipantsService, ParticipantStatus } from '../../core/services/participants.service';
import { ParticipantResponse } from '../../core/models/participant.models';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { DashboardStats } from '../../core/models';
import { DateFormatService } from '../../core/services/date-format.service';


@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, RouterLink, TranslateModule],
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  participantsService = inject(ParticipantsService);
  private preferencesService = inject(UserPreferencesService);
  private translateService = inject(TranslateService);
  public dateFormatService = inject(DateFormatService);

  dashboardStats$!: Observable<DashboardStats>;
  recentParticipants$!: Observable<any[]>;
  preferences$!: Observable<UserPreferences>;
  lastUpdateTime = new Date();

  // Auto-refresh subscription
  private refreshSubscription?: Subscription;

  ngOnInit(): void {
    this.preferences$ = this.preferencesService.preferences$;
    
    // Start auto-refresh subscription
    this.refreshSubscription = this.preferences$.pipe(
      switchMap(prefs => {
        const intervalMs = (prefs.autoRefreshInterval || 30) * 1000;
        return interval(intervalMs).pipe(
          startWith(0),
          switchMap(() => {
            // Obtain all participants for dashboard stats using higher limit
            const filters = {
              limit: 200,
              page: 1
            };
            return this.participantsService.getAllParticipants(filters);
          })
        );
      })
    ).subscribe();

    this.dashboardStats$ = this.participantsService.participants$.pipe(
      map(participants => {
        this.lastUpdateTime = new Date();
        return {
          totalParticipants: participants.length,
          activeParticipants: participants.filter((p: ParticipantResponse) => p.currentOperation === 'ACTIVE').length,
          provisioningParticipants: participants.filter((p: ParticipantResponse) => p.currentOperation === 'PROVISION_IN_PROGRESS').length,
          deprovisioningParticipants: participants.filter((p: ParticipantResponse) => p.currentOperation === 'DEPROVISION_IN_PROGRESS').length,
          deprovisionedParticipants: participants.filter((p: ParticipantResponse) => p.currentOperation === 'DEPROVISION_COMPLETED').length,
          failedParticipants: participants.filter((p: ParticipantResponse) => p.currentOperation === 'PROVISION_FAILED' || p.currentOperation === 'DEPROVISION_FAILED').length,
          errorParticipants: participants.filter((p: ParticipantResponse) => p.currentOperation === 'ERROR').length,
          totalCredentials: 0,
          totalOperations: 0
        };
      })
    );

    this.recentParticipants$ = combineLatest([this.participantsService.participants$, this.preferences$]).pipe(
      map(([participants, prefs]) => {
        const sortedParticipants = participants
          .sort((a: ParticipantResponse, b: ParticipantResponse) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const limit = prefs.defaultPageSize || 5;
        return sortedParticipants.slice(0, limit);
      })
    );
  }

  ngOnDestroy(): void {
    // Stop auto-refresh when component is destroyed
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
}
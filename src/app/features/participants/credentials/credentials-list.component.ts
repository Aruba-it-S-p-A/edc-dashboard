import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest, map, interval, Subscription, catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ParticipantsService } from '../../../core/services/participants.service';
import { CredentialResponse, CredentialStatus } from '../../../core/models/participant.models';
import { DateFormatService } from '../../../core/services/date-format.service';

@Component({
    selector: 'app-credentials-list',
    imports: [CommonModule, TranslateModule],
    templateUrl: './credentials-list.component.html',
    styleUrls: ['./credentials-list.component.scss']
})
export class CredentialsListComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private participantsService = inject(ParticipantsService);
  private translateService = inject(TranslateService);
  public dateFormatService = inject(DateFormatService);

  participantId!: string;
  participantName!: string;
  participant$!: Observable<any>;
  credentials$!: Observable<CredentialResponse[]>;
  loading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);

  isDeprovisioned$!: Observable<boolean>;

  // Auto-refresh subscription
  private refreshSubscription?: Subscription;

  // Status counts
  statusCounts$!: Observable<{
    requested: number;
    issued: number;
    expired: number;
    revoked: number;
    suspended: number;
  }>;

  ngOnInit(): void {
    this.participantId = this.route.snapshot.paramMap.get('id') || '';
    this.participantName = this.route.snapshot.queryParamMap.get('name') || 'Participant';
    
    // Load participant details to check if deprovisioned
    this.participant$ = this.participantsService.getParticipantById(this.participantId);
    this.isDeprovisioned$ = this.participant$.pipe(
      map(participant => participant.currentOperation === 'DEPROVISION_COMPLETED'),
      catchError(() => {
        // If we can't load participant details, assume it's not deprovisioned
        return of(false);
      })
    );
    
    this.loadCredentials();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private loadCredentials(): void {
    this.loading$.next(true);
    this.error$.next(null);

    this.credentials$ = this.participantsService.getParticipantCredentials(this.participantId);

    // Calculate status counts
    this.statusCounts$ = this.credentials$.pipe(
      map(credentials => {
        const counts = {
          requested: 0,
          issued: 0,
          expired: 0,
          revoked: 0,
          suspended: 0
        };

        credentials.forEach(cred => {
          switch (cred.status) {
            case CredentialStatus.REQUESTED:
              counts.requested++;
              break;
            case CredentialStatus.ISSUED:
              counts.issued++;
              break;
            case CredentialStatus.EXPIRED:
              counts.expired++;
              break;
            case CredentialStatus.REVOKED:
              counts.revoked++;
              break;
            case CredentialStatus.SUSPENDED:
              counts.suspended++;
              break;
          }
        });

        return counts;
      })
    );

    this.credentials$.subscribe({
      next: () => {
        this.loading$.next(false);
      },
      error: (error) => {
        this.error$.next(error.message || 'Error loading credentials');
        this.loading$.next(false);
      }
    });
  }

  private setupAutoRefresh(): void {
    // Refresh every 30 seconds to check for status updates
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadCredentials();
    });
  }

  requestNewCredentials(): void {
    this.router.navigate(['/participants', this.participantId, 'credentials', 'request'], {
      queryParams: { name: this.participantName }
    });
  }

  goBackToParticipant(): void {
    this.router.navigate(['/participants', this.participantId]);
  }

  getCredentialStatusColor(status: string): string {
    return this.participantsService.getCredentialStatusColor(status);
  }

  getCredentialStatusLabel(status: string): string {
    return this.participantsService.getCredentialStatusLabel(status);
  }

  isCredentialPending(status: string): boolean {
    return this.participantsService.isCredentialPending(status);
  }

  isCredentialActive(status: string): boolean {
    return this.participantsService.isCredentialActive(status);
  }

  isCredentialInactive(status: string): boolean {
    return this.participantsService.isCredentialInactive(status);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case CredentialStatus.REQUESTED:
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      case CredentialStatus.ISSUED:
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case CredentialStatus.EXPIRED:
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z';
      case CredentialStatus.REVOKED:
        return 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728';
      case CredentialStatus.SUSPENDED:
        return 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  trackByCredentialId(index: number, credential: CredentialResponse): string {
    return credential.id;
  }
}

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateFormatService } from '../../../core/services/date-format.service';
import { ParticipantsService, ParticipantStatus } from '../../../core/services/participants.service';
import { ParticipantResponse, CredentialResponse, OperationResponse } from '../../../core/models/participant.models';

@Component({
  selector: 'app-participant-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  templateUrl: './participant-detail.component.html',
  styleUrls: ['./participant-detail.component.scss']
})
export class ParticipantDetailComponent implements OnInit, OnDestroy {
  private participantsService = inject(ParticipantsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  public dateFormatService = inject(DateFormatService);
  private pollingSubscription?: Subscription;
  private participantId: string = '';

  participant$ = new BehaviorSubject<ParticipantResponse | null>(null);
  credentials$ = new BehaviorSubject<CredentialResponse[]>([]);
  operations$ = new BehaviorSubject<OperationResponse[]>([]);
  loading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);
  isDeprovisioned$ = new BehaviorSubject<boolean>(false);

  ngOnInit(): void {
    this.participantId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.participantId) {
      this.error$.next('Participant ID not found');
      this.loading$.next(false);
      return;
    }

    this.loadParticipant();
    this.loadCredentials();
    this.loadOperations();

    const intervalId = setInterval(() => {
      this.loadParticipant();
    }, 10000);

    this.pollingSubscription = {
      unsubscribe: () => {
        clearInterval(intervalId);
      }
    } as Subscription;
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  private loadParticipant(): void {
    this.participantsService.getParticipantById(this.participantId).subscribe({
      next: (participant: ParticipantResponse) => {
        this.participant$.next(participant);
        this.isDeprovisioned$.next(participant.currentOperation === ParticipantStatus.DEPROVISION_COMPLETED);
        this.loading$.next(false);
        this.error$.next(null);
      },
      error: (error: unknown) => {
        const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Error loading participant details';
        this.error$.next(message);
        this.loading$.next(false);
      }
    });
  }

  private loadCredentials(): void {
    this.participantsService.getParticipantCredentials(this.participantId).subscribe({
      next: (response: unknown) => {
        const credentials = Array.isArray(response) ? response : (response as { credentials?: unknown[] })?.credentials || [];
        this.credentials$.next(credentials);
      },
      error: () => {
      }
    });
  }

  private loadOperations(): void {
    this.participantsService.getParticipantOperations(this.participantId).subscribe({
      next: (response: unknown) => {
        const operations = Array.isArray(response) ? response : (response as { operations?: unknown[] })?.operations || [];
        this.operations$.next(operations);
      },
      error: () => {
      }
    });
  }

  getParticipantStatusLabel(status: string): string {
    return this.participantsService.getParticipantStatusLabel(status);
  }

  getParticipantStatusColor(status: string): string {
    return this.participantsService.getParticipantStatusColor(status);
  }

  isParticipantTransitional(status: string): boolean {
    return this.participantsService.isParticipantTransitional(status);
  }

  isParticipantFailed(status: string): boolean {
    return this.participantsService.isParticipantFailed(status);
  }

  getCredentialStatusColor(status: string): string {
    return this.participantsService.getCredentialStatusColor(status);
  }

  getCredentialStatusLabel(status: string): string {
    return this.participantsService.getCredentialStatusLabel(status);
  }

  onEdit(): void {
    const participant = this.participant$.value;
    if (participant) {
      this.router.navigate(['/participants', participant.id, 'edit']);
    }
  }

  onDelete(): void {
    const participant = this.participant$.value;
    if (participant && confirm(this.translateService.instant('participants.confirmDelete', { name: participant.name }))) {
      this.participantsService.deleteParticipant(participant.id).subscribe({
        next: () => {
          this.router.navigate(['/participants']);
        },
        error: (error: unknown) => {
          const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Error deleting participant';
          this.error$.next(message);
        }
      });
    }
  }

  onBack(): void {
    this.router.navigate(['/participants']);
  }

  formatMetadata(metadata: Record<string, any> | undefined): string {
    if (!metadata) return '';
    return JSON.stringify(metadata, null, 2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  hasMetadata(metadata: Record<string, any> | undefined): boolean {
    return metadata !== undefined && metadata !== null && Object.keys(metadata).length > 0;
  }
}
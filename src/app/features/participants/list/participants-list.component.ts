import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest, map, startWith, debounceTime, distinctUntilChanged, interval, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ParticipantsService, ParticipantStatus } from '../../../core/services/participants.service';
import { ParticipantResponse, ParticipantFilters } from '../../../core/models/participant.models';
import { UserPreferencesService, UserPreferences } from '../../../core/services/user-preferences.service';
import { ModalService } from '../../../core/services/modal.service';

@Component({
    selector: 'app-participants-list',
    imports: [CommonModule, RouterLink, FormsModule, TranslateModule],
    templateUrl: './participants-list.component.html',
    styleUrls: ['./participants-list.component.scss']
})
export class ParticipantsListComponent implements OnInit, OnDestroy {
  private participantsService = inject(ParticipantsService);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private preferencesService = inject(UserPreferencesService);
  private modalService = inject(ModalService);

  Array = Array;

  selectedStatus: ParticipantStatus | '' = '';
  currentPage = 1;

  participants$!: Observable<ParticipantResponse[]>;
  totalCount$!: Observable<number>;
  loading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);
  preferences$!: Observable<UserPreferences>;

  private refreshSubscription?: Subscription;

  statusOptions = [
    { value: '', label: 'participants.allStatuses' },
    { value: ParticipantStatus.ACTIVE, label: 'status.active' },
    { value: ParticipantStatus.PROVISION_IN_PROGRESS, label: 'status.provision_in_progress' },
    { value: ParticipantStatus.DEPROVISION_IN_PROGRESS, label: 'status.deprovision_in_progress' },
    { value: ParticipantStatus.DEPROVISION_COMPLETED, label: 'status.deprovision_completed' },
    { value: ParticipantStatus.PROVISION_FAILED, label: 'status.provision_failed' },
    { value: ParticipantStatus.DEPROVISION_FAILED, label: 'status.deprovision_failed' },
    { value: ParticipantStatus.ERROR, label: 'status.error' }
  ];

  ngOnInit(): void {
    this.preferences$ = this.preferencesService.preferences$;
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadParticipants(): void {
    this.loading$.next(true);
    this.error$.next(null);

    const currentPrefs = this.preferencesService.currentPreferences;
    const limit = currentPrefs.defaultPageSize || 10;

    const filters: ParticipantFilters = {
      status: this.selectedStatus || undefined,
      page: this.currentPage,
      limit: limit
    };

    this.participantsService.getAllParticipants(filters).subscribe({
      next: (participants) => {
        this.participants$ = new BehaviorSubject(participants);
        this.loading$.next(false);
      },
      error: (error) => {
        this.error$.next(error.message || 'Error loading participants');
        this.loading$.next(false);
      }
    });

    this.participantsService.pagination$.subscribe(pagination => {
      this.totalCount$ = new BehaviorSubject(pagination.total);
    });
  }

  private setupAutoRefresh(): void {
    this.preferences$.subscribe(prefs => {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }

      if (prefs.autoRefreshInterval > 0) {
        // Load participants immediately and then start interval
        this.loadParticipants();
        this.refreshSubscription = interval(prefs.autoRefreshInterval * 1000).subscribe(() => {
          this.loadParticipants();
        });
      } else {
        // If auto-refresh is disabled, load participants once
        this.loadParticipants();
      }
    });
  }


  onStatusChange(): void {
    this.currentPage = 1;
    this.loadParticipants();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadParticipants();
  }


  getParticipantStatusLabel(currentOperation: string): string {
    return this.participantsService.getParticipantStatusLabel(currentOperation);
  }

  getParticipantStatusColor(currentOperation: string): string {
    return this.participantsService.getParticipantStatusColor(currentOperation);
  }

  isParticipantTransitional(currentOperation: string): boolean {
    return this.participantsService.isParticipantTransitional(currentOperation);
  }

  isParticipantFailed(currentOperation: string): boolean {
    return this.participantsService.isParticipantFailed(currentOperation);
  }

  viewParticipant(participant: ParticipantResponse): void {
    this.router.navigate(['/participants', participant.id]);
  }

  editParticipant(participant: ParticipantResponse): void {
    this.router.navigate(['/participants', participant.id, 'edit']);
  }

  canDeleteParticipant(participant: ParticipantResponse): boolean {
    return participant.currentOperation === 'ACTIVE';
  }

  async deleteParticipant(participant: ParticipantResponse): Promise<void> {
    if (!this.canDeleteParticipant(participant)) {
      return;
    }

    const confirmed = await this.modalService.confirm({
      title: this.translateService.instant('participants.deleteParticipant'),
      message: this.translateService.instant('participants.confirmDelete', { name: participant.name }),
      confirmText: this.translateService.instant('common.delete'),
      cancelText: this.translateService.instant('common.cancel'),
      size: 'md'
    });

    if (confirmed) {
      this.participantsService.deleteParticipant(participant.id).subscribe({
        next: () => {
          this.loadParticipants();
        },
        error: (error) => {
          this.error$.next(error.message || 'Error deleting participant');
        }
      });
    }
  }

  get totalPages(): number {
    const currentPrefs = this.preferencesService.currentPreferences;
    const limit = currentPrefs.defaultPageSize || 10;
    return Math.ceil((this.totalCount$ as BehaviorSubject<number>)?.value / limit) || 0;
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  get startItem(): number {
    const currentPrefs = this.preferencesService.currentPreferences;
    const limit = currentPrefs.defaultPageSize || 10;
    return (this.currentPage - 1) * limit + 1;
  }

  get endItem(): number {
    const currentPrefs = this.preferencesService.currentPreferences;
    const limit = currentPrefs.defaultPageSize || 10;
    const total = (this.totalCount$ as BehaviorSubject<number>)?.value || 0;
    return Math.min(this.currentPage * limit, total);
  }
}

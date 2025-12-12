import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ConfigService } from './config.service';
import {
  ParticipantRequest,
  ParticipantUpdateRequest,
  ParticipantResponse,
  ParticipantListResponse,
  ParticipantStatus,
  ParticipantFilters,
  ParticipantStats,
  CredentialRequest,
  CredentialResponse,
  CredentialRequestResponse,
  OperationResponse,
  OperationListResponse
} from '../models/participant.models';

export { ParticipantStatus } from '../models/participant.models';

@Injectable({
  providedIn: 'root'
})
export class ParticipantsService {
  private http = inject(HttpClient);
  private translateService = inject(TranslateService);
  private configService = inject(ConfigService);
  
  private get baseUrl(): string {
    return `${this.configService.getApiUrl()}/v1`;
  }
  
  private get apiUrl(): string {
    return this.baseUrl;
  }
  
  private get httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
  }
  
  private participantsSubject = new BehaviorSubject<ParticipantResponse[]>([]);
  public participants$ = this.participantsSubject.asObservable();
  
  private paginationSubject = new BehaviorSubject<{total: number, page: number, limit: number}>({total: 0, page: 1, limit: 20});
  public pagination$ = this.paginationSubject.asObservable();

  getAllParticipants(filters?: ParticipantFilters): Observable<ParticipantListResponse> {
    let params = new HttpParams();
    
    if (filters?.status) {
      params = params.set('currentOperation', filters.status);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<ParticipantListResponse>(`${this.baseUrl}/participants`, { params, observe: 'response' }).pipe(
      map(response => {
        const total = parseInt(response.headers.get('X-Total') || '0');
        const page = parseInt(response.headers.get('X-Page') || '1');
        const limit = parseInt(response.headers.get('X-Limit') || '20');
        
        this.participantsSubject.next(response.body || []);
        this.paginationSubject.next({ total, page, limit });
        
        return response.body || [];
      }),
      catchError(this.handleError)
    );
  }

  getParticipantById(participantId: string): Observable<ParticipantResponse> {
    return this.http.get<ParticipantResponse>(`${this.baseUrl}/participants/${participantId}`).pipe(
      catchError(this.handleError)
    );
  }

  createParticipant(participant: ParticipantRequest): Observable<ParticipantResponse> {
    return this.http.post<ParticipantResponse>(`${this.baseUrl}/participants`, participant).pipe(
      tap(newParticipant => {
        const currentParticipants = this.participantsSubject.value;
        this.participantsSubject.next([...currentParticipants, newParticipant]);
      }),
      catchError(this.handleError)
    );
  }

  updateParticipant(participantId: string, updates: ParticipantUpdateRequest): Observable<ParticipantResponse> {
    return this.http.patch<ParticipantResponse>(`${this.baseUrl}/participants/${participantId}`, updates).pipe(
      tap(updatedParticipant => {
        const currentParticipants = this.participantsSubject.value;
        const index = currentParticipants.findIndex(p => p.id === participantId);
        if (index !== -1) {
          currentParticipants[index] = updatedParticipant;
          this.participantsSubject.next([...currentParticipants]);
        }
      }),
      catchError(this.handleError)
    );
  }

  deleteParticipant(participantId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/participants/${participantId}`).pipe(
      tap(() => {
        const currentParticipants = this.participantsSubject.value;
        const filteredParticipants = currentParticipants.filter(p => p.id !== participantId);
        this.participantsSubject.next(filteredParticipants);
      }),
      catchError(this.handleError)
    );
  }

  getParticipantCredentials(participantId: string, filters?: { status?: string; page?: number; limit?: number }): Observable<CredentialResponse[]> {
    let params = new HttpParams();
    
    if (filters?.status) {
      params = params.set('currentOperation', filters.status);
    }
    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<CredentialResponse[]>(`${this.baseUrl}/participants/${participantId}/credentials`, { params, observe: 'response' }).pipe(
      map(response => {
        const total = parseInt(response.headers.get('X-Total') || '0');
        const page = parseInt(response.headers.get('X-Page') || '1');
        const limit = parseInt(response.headers.get('X-Limit') || '20');
        
        this.paginationSubject.next({ total, page, limit });
        
        return response.body || [];
      }),
      catchError(this.handleError)
    );
  }

  getCredential(participantId: string, credentialId: string): Observable<CredentialResponse> {
    return this.http.get<CredentialResponse>(`${this.baseUrl}/participants/${participantId}/credentials/${credentialId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateCredentials(participantId: string, credentials: CredentialRequest): Observable<CredentialResponse[]> {
    return this.http.put<CredentialResponse[]>(`${this.baseUrl}/participants/${participantId}/credentials`, credentials).pipe(
      catchError(this.handleError)
    );
  }

  getParticipantOperations(participantId: string, page = 1, limit = 10): Observable<OperationListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<OperationListResponse>(`${this.baseUrl}/participants/${participantId}/operations`, { params, observe: 'response' }).pipe(
      map(response => {
        const total = parseInt(response.headers.get('X-Total') || '0');
        const page = parseInt(response.headers.get('X-Page') || '1');
        const limit = parseInt(response.headers.get('X-Limit') || '20');
        
        this.paginationSubject.next({ total, page, limit });
        
        return response.body || [];
      }),
      catchError(this.handleError)
    );
  }

  getParticipantStats(): Observable<ParticipantStats> {
    return this.http.get<ParticipantStats>(`${this.baseUrl}/participants/stats`).pipe(
      catchError(this.handleError)
    );
  }

  getParticipantStatusLabel(currentOperation: string): string {
    if (!currentOperation) {
      return this.translateService.instant('status.unknown');
    }
    return this.translateService.instant(`status.${currentOperation.toLowerCase()}`);
  }

  getParticipantStatusColor(currentOperation: string): string {
    if (!currentOperation) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
    const statusColors: Record<string, string> = {
      'ACTIVE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'PROVISION_IN_PROGRESS': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'DEPROVISION_IN_PROGRESS': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'PROVISION_FAILED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'DEPROVISION_FAILED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return statusColors[currentOperation] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }

  isParticipantTransitional(currentOperation: string): boolean {
    if (!currentOperation) {
      return false;
    }
    return currentOperation === 'PROVISION_IN_PROGRESS' || 
           currentOperation === 'DEPROVISION_IN_PROGRESS';
  }

  isParticipantFailed(currentOperation: string): boolean {
    if (!currentOperation) {
      return false;
    }
    return currentOperation === 'PROVISION_FAILED' || 
           currentOperation === 'DEPROVISION_FAILED';
  }

  requestCredentials(participantId: string, credentialRequest: CredentialRequest): Observable<CredentialRequestResponse> {
    const url = `${this.apiUrl}/participants/${participantId}/credentials`;
    return this.http.post<CredentialRequestResponse>(url, credentialRequest, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getCredentialStatusColor(status: string): string {
    switch (status) {
      case 'REQUESTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'ISSUED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'REVOKED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }

  getCredentialStatusLabel(status: string): string {
    return this.translateService.instant(`credentials.status.${status.toLowerCase()}`);
  }

  /**
   * Check if credential is in pending state
   */
  isCredentialPending(status: string): boolean {
    return status === 'REQUESTED';
  }

  /**
   * Check if credential is active
   */
  isCredentialActive(status: string): boolean {
    return status === 'ISSUED';
  }

  /**
   * Check if credential is expired or revoked
   */
  isCredentialInactive(status: string): boolean {
    return status === 'EXPIRED' || status === 'REVOKED' || status === 'SUSPENDED';
  }

  /**
   * Error handler
   */
  private handleError = (error: unknown): Observable<never> => {
    let errorMessage = 'An error occurred';
    
    if (error && typeof error === 'object') {
      if ('error' in error && error.error && typeof error.error === 'object' && 'message' in error.error) {
        errorMessage = String(error.error.message);
      } else if ('message' in error) {
        errorMessage = String(error.message);
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, catchError, of } from 'rxjs';
import { DashboardStats, ChartData } from '../models';
import { ParticipantsService, ParticipantStatus } from './participants.service';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private participantsService = inject(ParticipantsService);
  private configService = inject(ConfigService);


  getDashboardStats(): Observable<DashboardStats> {

    if (!this.configService.isFeatureEnabled('enableMockData')) {
      const statsUrl = `${this.configService.getApiUrl()}/api/dashboard/stats`;
      return this.http.get<DashboardStats>(statsUrl).pipe(
        catchError(() => this.getCalculatedStats())
      );
    }
    
    return this.getCalculatedStats();
  }

  private getCalculatedStats(): Observable<DashboardStats> {
    return this.participantsService.getAllParticipants().pipe(
      map(response => {
        const participants = response.participants;
        const activeParticipants = participants.filter(p => p.status === ParticipantStatus.ACTIVE).length;
        const provisioningParticipants = participants.filter(p => 
          p.status === ParticipantStatus.PROVISION_IN_PROGRESS
        ).length;
        const deprovisioningParticipants = participants.filter(p => 
          p.status === ParticipantStatus.DEPROVISION_IN_PROGRESS
        ).length;
        const failedParticipants = participants.filter(p => 
          p.status === ParticipantStatus.PROVISION_FAILED || 
          p.status === ParticipantStatus.DEPROVISION_FAILED
        ).length;

        return {
          totalParticipants: participants.length,
          activeParticipants,
          provisioningParticipants,
          deprovisioningParticipants,
          failedParticipants,
          totalCredentials: 0, // Will be calculated separately
          totalOperations: 0 // Will be calculated separately
        };
      })
    );
  }


  getParticipantStatusChart(): Observable<ChartData> {
    return this.participantsService.getAllParticipants().pipe(
      map(response => {
        const participants = response.participants;
        const statusCounts = {
          'ACTIVE': 0,
          'PROVISION_IN_PROGRESS': 0,
          'DEPROVISION_IN_PROGRESS': 0,
          'PROVISION_FAILED': 0,
          'DEPROVISION_FAILED': 0
        };

        participants.forEach(p => {
          if (statusCounts.hasOwnProperty(p.status)) {
            statusCounts[p.status as keyof typeof statusCounts]++;
          }
        });

        return {
          labels: Object.keys(statusCounts),
          datasets: [{
            label: 'Participant Status',
            data: Object.values(statusCounts),
            backgroundColor: [
              '#10b981', // ACTIVE - green
              '#f59e0b', // PROVISION_IN_PROGRESS - yellow
              '#f97316', // DEPROVISION_IN_PROGRESS - orange
              '#ef4444', // PROVISION_FAILED - red
              '#dc2626'  // DEPROVISION_FAILED - dark red
            ],
            borderColor: [
              '#059669',
              '#d97706',
              '#ea580c',
              '#dc2626',
              '#b91c1c'
            ],
            borderWidth: 1
          }]
        };
      })
    );
  }


  getParticipantTimelineChart(): Observable<ChartData> {
    return this.participantsService.getAllParticipants().pipe(
      map(response => {
        const participants = response.participants;

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const dailyCounts = last7Days.map(date => {
          return participants.filter(p => 
            p.createdAt && new Date(p.createdAt).toISOString().split('T')[0] === date
          ).length;
        });

        return {
          labels: last7Days.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
          }),
          datasets: [{
            label: 'New Participants',
            data: dailyCounts,
            backgroundColor: ['rgba(59, 130, 246, 0.1)'],
            borderColor: ['#3b82f6'],
            borderWidth: 2,
          }]
        };
      })
    );
  }
}
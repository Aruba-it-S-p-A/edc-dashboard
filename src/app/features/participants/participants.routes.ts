import { Routes } from '@angular/router';

export const PARTICIPANT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/participants-list.component').then(m => m.ParticipantsListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./create-edit/participant-create.component').then(m => m.ParticipantCreateComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./detail/participant-detail.component').then(m => m.ParticipantDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./create-edit/participant-edit.component').then(m => m.ParticipantEditComponent)
  },
  {
    path: ':id/credentials',
    loadComponent: () => import('./credentials/credentials-list.component').then(m => m.CredentialsListComponent)
  },
  {
    path: ':id/credentials/request',
    loadComponent: () => import('./credentials/credential-request.component').then(m => m.CredentialRequestComponent)
  }
];

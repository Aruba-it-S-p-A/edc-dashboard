import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ParticipantsService } from '../../../core/services/participants.service';
import { CredentialRequest, CredentialDefinition, CredentialResponse } from '../../../core/models/participant.models';

@Component({
    selector: 'app-credential-request',
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    templateUrl: './credential-request.component.html',
    styleUrls: ['./credential-request.component.scss']
})
export class CredentialRequestComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private participantsService = inject(ParticipantsService);
  private translateService = inject(TranslateService);

  participantId!: string;
  participantName!: string;
  credentialForm!: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Available credential types
  credentialTypes = [
    { value: 'MembershipCredential', label: 'credentials.types.membership' },
    { value: 'DataProcessorCredential', label: 'credentials.types.dataProcessor' }
  ];

  // Available credential definitions
  credentialDefinitions = [
    { id: 'membership-credential-def', type: 'MembershipCredential', label: 'credentials.definitions.membership' },
    { id: 'dataprocessor-credential-def', type: 'DataProcessorCredential', label: 'credentials.definitions.dataProcessor' }
  ];

  ngOnInit(): void {
    this.participantId = this.route.snapshot.paramMap.get('id') || '';
    this.participantName = this.route.snapshot.queryParamMap.get('name') || 'Participant';
    
    this.initForm();
  }

  private initForm(): void {
    this.credentialForm = this.fb.group({
      credentials: this.fb.array([
        this.createCredentialGroup()
      ])
    });
  }

  private createCredentialGroup(): FormGroup {
    return this.fb.group({
      format: ['VC1_0_JWT', Validators.required],
      type: ['', Validators.required],
      id: ['', Validators.required]
    });
  }

  get credentialsArray(): FormArray {
    return this.credentialForm.get('credentials') as FormArray;
  }

  addCredential(): void {
    this.credentialsArray.push(this.createCredentialGroup());
  }

  removeCredential(index: number): void {
    if (this.credentialsArray.length > 1) {
      this.credentialsArray.removeAt(index);
    }
  }

  getCredentialDefinitionsForType(type: string) {
    return this.credentialDefinitions.filter(def => def.type === type);
  }

  onSubmit(): void {
    if (this.credentialForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = null;
      this.successMessage = null;

      const formValue = this.credentialForm.value;
      const credentialRequest: CredentialRequest = {
        credentials: formValue.credentials
      };

      this.participantsService.requestCredentials(this.participantId, credentialRequest)
        .subscribe({
          next: (response) => {
            this.successMessage = this.translateService.instant('credentials.requestSuccess', { 
              count: response.credentials.length 
            });
            this.isSubmitting = false;
            
            // Redirect back to participant detail after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/participants', this.participantId]);
            }, 2000);
          },
          error: (error) => {
            this.errorMessage = error.message || this.translateService.instant('credentials.requestError');
            this.isSubmitting = false;
          }
        });
    }
  }

  onCancel(): void {
    this.router.navigate(['/participants', this.participantId]);
  }

  isFormValid(): boolean {
    return this.credentialForm.valid && this.credentialsArray.length > 0;
  }
}

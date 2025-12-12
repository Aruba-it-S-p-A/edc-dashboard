import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ParticipantsService } from '../../../core/services/participants.service';
import { ParticipantRequest } from '../../../core/models/participant.models';

@Component({
    selector: 'app-participant-create',
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    templateUrl: './participant-create.component.html',
    styleUrls: ['./participant-create.component.scss']
})
export class ParticipantCreateComponent implements OnInit {
  private participantsService = inject(ParticipantsService);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private fb = inject(FormBuilder);

  participantForm!: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.participantForm = this.fb.group({
      // Company/Organization fields
      companyName: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(63)
      ]],
      companyDescription: ['', [Validators.maxLength(500)]],
      
      // Company metadata fields
      companyType: [''],
      vatNumber: [''],
      fiscalCode: [''],
      companyEmail: [''],
      companyPhone: [''],
      companyWebsite: [''],
      companyIndustry: [''],
      country: [''],
      region: [''],
      city: [''],
      address: [''],
      postalCode: [''],
      businessSize: [''],
      termsAccepted: [false],
      privacyAccepted: [false],
      marketingAccepted: [false],
      registrationSource: ['B2C_PORTAL'],
      environment: ['production'],
      
      // User fields
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])(?!.*\s)[A-Za-z\d@$!%*?&]+$/)
      ]],
      
      // User metadata fields
      firstName: [''],
      lastName: [''],
      userEmail: [''],
      userPhone: [''],
      userRole: ['']
    });
  }

  onSubmit(): void {
    if (this.participantForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.error = null;

      const formValue = this.participantForm.value;
      const participantData: ParticipantRequest = {
        participant: {
          name: formValue.companyName,
          description: formValue.companyDescription || undefined,
          metadata: this.buildCompanyMetadata(formValue)
        },
        user: {
          username: formValue.username,
          password: formValue.password,
          metadata: this.buildUserMetadata(formValue)
        }
      };

      this.participantsService.createParticipant(participantData).subscribe({
        next: (participant) => {
          this.router.navigate(['/participants', participant.id]);
        },
        error: (error) => {
          this.error = error.message || this.translateService.instant('participants.createError');
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/participants']);
  }

  private buildCompanyMetadata(formValue: Record<string, unknown>): Record<string, unknown> | undefined {
    const metadata: Record<string, unknown> = {};
    
    if (formValue['companyType']) metadata['companyType'] = formValue['companyType'];
    if (formValue['vatNumber']) metadata['vatNumber'] = formValue['vatNumber'];
    if (formValue['fiscalCode']) metadata['fiscalCode'] = formValue['fiscalCode'];
    if (formValue['companyEmail']) metadata['email'] = formValue['companyEmail'];
    if (formValue['companyPhone']) metadata['phone'] = formValue['companyPhone'];
    if (formValue['companyWebsite']) metadata['website'] = formValue['companyWebsite'];
    if (formValue['companyIndustry']) metadata['industry'] = formValue['companyIndustry'];
    if (formValue['country']) metadata['country'] = formValue['country'];
    if (formValue['region']) metadata['region'] = formValue['region'];
    if (formValue['city']) metadata['city'] = formValue['city'];
    if (formValue['address']) metadata['address'] = formValue['address'];
    if (formValue['postalCode']) metadata['postalCode'] = formValue['postalCode'];
    if (formValue['businessSize']) metadata['businessSize'] = formValue['businessSize'];
    if (formValue['termsAccepted'] !== undefined) metadata['termsAccepted'] = formValue['termsAccepted'];
    if (formValue['privacyAccepted'] !== undefined) metadata['privacyAccepted'] = formValue['privacyAccepted'];
    if (formValue['marketingAccepted'] !== undefined) metadata['marketingAccepted'] = formValue['marketingAccepted'];
    if (formValue['registrationSource']) metadata['registrationSource'] = formValue['registrationSource'];
    if (formValue['environment']) metadata['environment'] = formValue['environment'];
    
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private buildUserMetadata(formValue: Record<string, unknown>): Record<string, unknown> | undefined {
    const metadata: Record<string, unknown> = {};
    
    if (formValue['firstName']) metadata['firstName'] = formValue['firstName'];
    if (formValue['lastName']) metadata['lastName'] = formValue['lastName'];
    if (formValue['userEmail']) metadata['email'] = formValue['userEmail'];
    if (formValue['userPhone']) metadata['phone'] = formValue['userPhone'];
    if (formValue['userRole']) metadata['role'] = formValue['userRole'];
    
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private parseMetadata(metadataString: string): Record<string, unknown> | undefined {
    if (!metadataString?.trim()) {
      return undefined;
    }

    try {
      return JSON.parse(metadataString);
    } catch (error) {
      this.participantForm.get('metadata')?.setErrors({ invalidJson: true });
      return undefined;
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.participantForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return this.translateService.instant('validation.required');
      }
      if (field.errors['minlength']) {
        return this.translateService.instant('validation.minLength', { min: field.errors['minlength'].requiredLength });
      }
      if (field.errors['maxlength']) {
        return this.translateService.instant('validation.maxLength', { max: field.errors['maxlength'].requiredLength });
      }
      if (field.errors['pattern']) {
        if (fieldName === 'companyName') {
          return this.translateService.instant('participants.invalidCompanyNameFormat');
        } else if (fieldName === 'username') {
          return this.translateService.instant('participants.invalidUsernameFormat');
        } else if (fieldName === 'password') {
          return this.translateService.instant('participants.invalidPasswordFormat');
        }
      }
      if (field.errors['invalidJson']) {
        return this.translateService.instant('participants.invalidJsonFormat');
      }
    }
    return null;
  }

  get isFormValid(): boolean {
    return this.participantForm.valid && !this.isSubmitting;
  }
}

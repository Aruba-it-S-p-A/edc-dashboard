import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap, map } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ParticipantsService } from '../../../core/services/participants.service';
import { ParticipantResponse, ParticipantUpdateRequest } from '../../../core/models/participant.models';

@Component({
    selector: 'app-participant-edit',
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    templateUrl: './participant-edit.component.html',
    styleUrls: ['./participant-edit.component.scss']
})
export class ParticipantEditComponent implements OnInit, OnDestroy {
  private participantsService = inject(ParticipantsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private fb = inject(FormBuilder);

  participant$!: Observable<ParticipantResponse>;
  participantForm!: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  participantId: string | null = null;

  ngOnInit(): void {
    this.participantId = this.route.snapshot.paramMap.get('id');
    
    if (!this.participantId) {
      this.router.navigate(['/participants']);
      return;
    }

    this.participant$ = this.participantsService.getParticipantById(this.participantId);
    
    this.participant$.subscribe({
      next: (participant) => {
        this.initForm(participant);
      },
      error: (error) => {
        this.error = error.message || 'Error loading participant';
      }
    });
  }

  ngOnDestroy(): void {
  }

  private initForm(participant: ParticipantResponse): void {
    this.participantForm = this.fb.group({
      name: [{ value: participant.name, disabled: true }],
      description: [participant.description || '', [Validators.maxLength(500)]],
      metadata: [this.formatMetadata(participant.metadata)]
    });
  }

  onSubmit(): void {
    if (this.participantForm.valid && !this.isSubmitting && this.participantId) {
      this.isSubmitting = true;
      this.error = null;

      const formValue = this.participantForm.value;
      const updateData: ParticipantUpdateRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        metadata: this.parseMetadata(formValue.metadata)
      };

      this.participantsService.updateParticipant(this.participantId, updateData).subscribe({
        next: (participant) => {
          this.router.navigate(['/participants', participant.id]);
        },
        error: (error) => {
          this.error = error.message || this.translateService.instant('participants.updateError');
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    if (this.participantId) {
      this.router.navigate(['/participants', this.participantId]);
    } else {
      this.router.navigate(['/participants']);
    }
  }

  private formatMetadata(metadata: Record<string, any> | undefined): string {
    if (!metadata) return '';
    return JSON.stringify(metadata, null, 2);
  }

  private parseMetadata(metadataString: string): Record<string, any> | undefined {
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
        return this.translateService.instant('participants.invalidNameFormat');
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

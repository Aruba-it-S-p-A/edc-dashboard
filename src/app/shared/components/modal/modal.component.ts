import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalConfig } from '../../../core/services/modal.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-modal',
    imports: [CommonModule],
    templateUrl: './modal.component.html'
})
export class ModalComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private subscription?: Subscription;

  modals: ModalConfig[] = [];

  ngOnInit(): void {
    this.subscription = this.modalService.modals$.subscribe(modals => {
      this.modals = modals;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onBackdropClick(modal: ModalConfig): void {
    if (modal.backdropClose !== false) {
      this.closeModal(modal.id);
    }
  }

  onConfirm(modal: ModalConfig): void {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    this.closeModal(modal.id);
  }

  onCancel(modal: ModalConfig): void {
    if (modal.onCancel) {
      modal.onCancel();
    }
    this.closeModal(modal.id);
  }

  closeModal(id: string): void {
    this.modalService.close(id);
  }
}
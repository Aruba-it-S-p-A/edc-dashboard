import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalData {
  [key: string]: unknown;
}

export interface ModalConfig {
  id: string;
  type: 'confirm' | 'alert' | 'custom';
  title: string;
  message?: string;
  isHtml?: boolean;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  backdropClose?: boolean;
  data?: ModalData;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalsSubject = new BehaviorSubject<ModalConfig[]>([]);
  public modals$ = this.modalsSubject.asObservable();

  constructor() {}

  confirm(config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    size?: 'sm' | 'md' | 'lg';
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const modalId = this.generateId();
      const modal: ModalConfig = {
        id: modalId,
        type: 'confirm',
        title: config.title,
        message: config.message,
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        showCancel: true,
        size: config.size || 'md',
        onConfirm: () => {
          this.close(modalId);
          resolve(true);
        },
        onCancel: () => {
          this.close(modalId);
          resolve(false);
        }
      };
      this.open(modal);
    });
  }

  alert(config: {
    title: string;
    message: string;
    confirmText?: string;
    size?: 'sm' | 'md' | 'lg';
    isHtml?: boolean;
  }): Promise<void> {
    return new Promise((resolve) => {
      const modalId = this.generateId();
      const modal: ModalConfig = {
        id: modalId,
        type: 'alert',
        title: config.title,
        message: config.message,
        isHtml: config.isHtml || false,
        confirmText: config.confirmText || 'OK',
        showCancel: false,
        size: config.size || 'md',
        onConfirm: () => {
          this.close(modalId);
          resolve();
        }
      };
      this.open(modal);
    });
  }

  openCustom(config: {
    id?: string;
    title: string;
    data?: ModalData;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }): string {
    const modalId = config.id || this.generateId();
    const modal: ModalConfig = {
      id: modalId,
      type: 'custom',
      title: config.title,
      data: config.data,
      size: config.size || 'md'
    };
    this.open(modal);
    return modalId;
  }

  private open(modal: ModalConfig): void {
    const currentModals = this.modalsSubject.value;
    this.modalsSubject.next([...currentModals, modal]);
    
    // Prevent body scroll
    document.body.classList.add('modal-open');
  }

  close(id: string): void {
    const currentModals = this.modalsSubject.value;
    const filteredModals = currentModals.filter(modal => modal.id !== id);
    this.modalsSubject.next(filteredModals);
    
    // Re-enable body scroll if no modals are open
    if (filteredModals.length === 0) {
      document.body.classList.remove('modal-open');
    }
  }

  closeAll(): void {
    this.modalsSubject.next([]);
    document.body.classList.remove('modal-open');
  }

  getModal(id: string): Observable<ModalConfig | undefined> {
    return new Observable(observer => {
      this.modals$.subscribe(modals => {
        const modal = modals.find(m => m.id === id);
        observer.next(modal);
      });
    });
  }

  private generateId(): string {
    return 'modal-' + Math.random().toString(36).substr(2, 9);
  }
}
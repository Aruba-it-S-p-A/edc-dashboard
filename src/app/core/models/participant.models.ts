export interface ParticipantRequest {
  participant: {
    name: string;
    description?: string;
    metadata?: Record<string, any>;
  };
  user: {
    username: string;
    password: string;
    metadata?: Record<string, any>;
  };
}

export interface ParticipantUpdateRequest {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ParticipantResponse {
  id: string;
  name: string;
  did: string;
  host: string;
  currentOperation: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum ParticipantStatus {
  PROVISION_IN_PROGRESS = 'PROVISION_IN_PROGRESS',
  ACTIVE = 'ACTIVE',
  DEPROVISION_IN_PROGRESS = 'DEPROVISION_IN_PROGRESS',
  DEPROVISION_COMPLETED = 'DEPROVISION_COMPLETED',
  PROVISION_FAILED = 'PROVISION_FAILED',
  DEPROVISION_FAILED = 'DEPROVISION_FAILED',
  ERROR = 'ERROR'
}

export interface CredentialRequest {
  credentials: CredentialDefinition[];
}

export interface CredentialDefinition {
  format: 'VC1_0_JWT';
  type: 'MembershipCredential' | 'DataProcessorCredential';
  id: string;
}

export interface CredentialResponse {
  id: string;
  requestId?: string;
  credentialType: string;
  type: string;
  format: string;
  status: CredentialStatus;
  issuedAt?: string;
  expiresAt?: string;
  credentialHash?: string;
  createdAt: string;
}

export enum CredentialStatus {
  REQUESTED = 'REQUESTED',
  ISSUED = 'ISSUED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED'
}

export interface CredentialRequestResponse {
  requestId: string;
  participantId: string;
  status: 'REQUESTED';
  credentials: Array<{
    format: string;
    type: string;
    id: string;
    status: 'REQUESTED';
  }>;
}

export interface OperationResponse {
  id: string;
  eventType: string;
  eventPayload?: {
    message?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export enum OperationType {
  PROVISION = 'PROVISION',
  DEPROVISION = 'DEPROVISION',
  UPDATE_CREDENTIALS = 'UPDATE_CREDENTIALS',
  UPDATE_METADATA = 'UPDATE_METADATA'
}

export enum OperationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export type ParticipantListResponse = ParticipantResponse[];


export type OperationListResponse = OperationResponse[];

export interface ParticipantFilters {
  status?: ParticipantStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ParticipantStats {
  total: number;
  active: number;
  provisioning: number;
  deprovisioning: number;
  failed: number;
}

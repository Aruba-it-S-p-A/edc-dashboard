export * from './participant.models';

export interface DashboardStats {
  totalParticipants: number;
  activeParticipants: number;
  provisioningParticipants: number;
  deprovisioningParticipants: number;
  deprovisionedParticipants: number;
  failedParticipants: number;
  errorParticipants: number;
  totalCredentials: number;
  totalOperations: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export type PaginatedResponse<T> = T[];

export interface TableFilter {
  field: string;
  value: string | number | boolean;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt';
}

export type Theme = 'light' | 'dark' | 'system';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: NavItem[];
  badge?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface FormState<T> extends LoadingState {
  data: T;
  isDirty: boolean;
  isValid: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface Modal {
  id: string;
  title: string;
  component: any;
  data?: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  permissions: string[];
}

export interface ActivityLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;
  status: 'SUCCESS' | 'FAILED';
}
export enum ReferralStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  SCHEDULED = 'SCHEDULED',      // After hospital accepts but before arrival
  CHECKED_IN = 'CHECKED_IN',    // Patient arrived at hospital
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}


export enum UrgencyLevel {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

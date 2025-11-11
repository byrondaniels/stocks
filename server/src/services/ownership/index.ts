/**
 * Ownership Service
 * Main export for detailed ownership functionality
 */

export { getDetailedOwnership, clearDetailedOwnershipCache } from './detailed-ownership-service.js';
export type {
  DetailedOwnership,
  InsiderOwner,
  BeneficialOwner,
  InstitutionalHolder,
  TopHolder,
  OwnershipBreakdown,
} from './types.js';

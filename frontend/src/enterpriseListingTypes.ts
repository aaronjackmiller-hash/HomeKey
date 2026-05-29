export type ListingRelation =
  | 'Renter'
  | 'PropertyOwner'
  | 'AgentBroker'
  | 'PropertyManager';

export type OnboardingMethod = 'SyncPortfolio' | 'AddManualSingle';

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  leadsPassed: number;
  activeProperties: number;
  conversionRate: string;
}

export interface SyncedListing {
  id: string;
  address: string;
  source: 'Yad2' | 'Website' | 'Facebook' | 'Manual';
  price: number;
  assignedAgentId: string;
  boosterActive: boolean;
  leadsCount: number;
}


export enum ProjectStatus {
  QUALIFICATION = 'Qualification',
  DISCOVERY = 'Détection',
  PREPARATION = 'Préparation',
  SUBMITTED = 'Soumis',
  APPROVED = 'Approuvé',
  REJECTED = 'Refusé'
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  siret?: string;
  sector: string;
  region: string;
  size: 'TPE' | 'PME' | 'GE';
  createdAt: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  content: string; // Texte brut ou DataURL
  uploadDate: string;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  context?: string;
  
  // Synthèse Complète
  startDate?: string;
  endDate?: string;
  duration?: string;
  theme?: string;
  projectType?: string;
  target?: string; // Objectif du projet
  objectives?: string; // Détails objectifs
  expectedResults?: string; // Résultats
  location?: string; // Situation géographique
  financingPlan?: string; // Plan de financement
  
  status: ProjectStatus;
  selectedGrantIds: string[];
  validatedGrant?: Grant; // L'aide validée
  documents: DocumentFile[];
  grantDocuments?: DocumentFile[]; // Pièces justificatives pour le dossier de subvention
  createdAt: string;
  updatedAt: string;
}

export interface Grant {
  id: string;
  title: string;
  provider: string;
  amount: string;
  description: string;
  deadline?: string;
  url?: string;
  sources?: string;
  funders?: string;
  fundingRate?: string;
  openingPeriod?: string;
  requiredDocuments?: string[];
  compatibilityScore?: number;
  compatibilityReason?: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
}

export interface UserRole {
  isAdmin: boolean;
  name: string;
  email: string;
}

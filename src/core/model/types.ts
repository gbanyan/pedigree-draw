/**
 * Core type definitions for the pedigree drawing tool
 * Following NSGC (National Society of Genetic Counselors) standards
 */

// ============================================
// Enums
// ============================================

export enum Sex {
  Male = 'male',
  Female = 'female',
  Unknown = 'unknown',
}

export enum Phenotype {
  Unknown = 'unknown',
  Unaffected = 'unaffected',
  Affected = 'affected',
  Carrier = 'carrier',
}

export enum RelationshipType {
  Spouse = 'spouse',
  Consanguineous = 'consanguineous',
}

export enum PartnershipStatus {
  Married = 'married',
  Separated = 'separated',
  Divorced = 'divorced',
  Unmarried = 'unmarried',  // Living together but not married
}

export enum ChildlessReason {
  None = 'none',
  ByChoice = 'by-choice',
  Infertility = 'infertility',
}

export enum TwinType {
  None = 'none',
  Monozygotic = 'monozygotic', // Identical twins
  Dizygotic = 'dizygotic',     // Fraternal twins
}

// ============================================
// Status & Metadata
// ============================================

export interface PersonStatus {
  isDeceased: boolean;
  isProband: boolean;
  isAdopted: boolean;
  isAdoptedIn: boolean;  // Adopted into family
  isAdoptedOut: boolean; // Adopted out of family
  isMiscarriage: boolean;
  isStillbirth: boolean;
  isPregnancy: boolean;
  isInfertile: boolean;
}

export interface PersonMetadata {
  label?: string;
  label2?: string;         // Second line custom text
  showBirthYear?: boolean; // Show birth year in label
  showDeathYear?: boolean; // Show death year in label
  showAge?: boolean;       // Show age in label
  notes?: string;
  birthYear?: number;
  deathYear?: number;
  age?: number;
}

// ============================================
// Core Entities
// ============================================

export interface Person {
  id: string;
  familyId: string;

  // Basic attributes
  sex: Sex;
  phenotypes: Phenotype[];
  status: PersonStatus;
  metadata: PersonMetadata;

  // Family relationships (IDs)
  fatherId: string | null;
  motherId: string | null;
  spouseIds: string[];
  childrenIds: string[];

  // Twin information
  twinType: TwinType;
  twinGroupId: string | null;

  // Layout position (calculated by layout algorithm)
  x?: number;
  y?: number;
  generation?: number;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  person1Id: string;
  person2Id: string;

  // Partnership details
  partnershipStatus?: PartnershipStatus;
  consanguinityDegree?: number;  // 1 = first cousins, 2 = second cousins, etc.

  // LGBTQ+ relationship support
  isSameSex?: boolean;

  // Children from this union
  childrenIds: string[];

  // Childlessness indicator
  childlessReason?: ChildlessReason;

  // Legacy (keep for backward compatibility)
  isSeparated?: boolean;
}

export interface Pedigree {
  id: string;
  familyId: string;
  name?: string;

  // Core data
  persons: Map<string, Person>;
  relationships: Map<string, Relationship>;

  // Metadata
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
    version: string;
  };
}

// ============================================
// PED File Format Types
// ============================================

export interface PedRecord {
  familyId: string;
  individualId: string;
  paternalId: string;  // '0' means unknown/founder
  maternalId: string;  // '0' means unknown/founder
  sex: Sex;
  phenotype: Phenotype;
  rawSex: string;      // Original value from file
  rawPhenotype: string; // Original value from file
}

export interface PedParseResult {
  records: PedRecord[];
  errors: PedParseError[];
  warnings: string[];
}

export interface PedParseError {
  line: number;
  message: string;
  rawLine: string;
}

// ============================================
// Layout Types
// ============================================

export interface LayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  siblingSpacing: number;
  spouseSpacing: number;
}

export interface LayoutNode {
  person: Person;
  x: number;
  y: number;
  generation: number;
  order: number; // Order within generation
}

/**
 * Family Unit - represents a couple and their children
 * Used for calculating layout widths and preventing overlaps
 */
export interface FamilyUnit {
  id: string;
  parents: string[];        // Person IDs of parents (1-2 people)
  children: string[];       // Person IDs of direct children
  relationshipId: string | null;
  generation: number;       // Generation of the parents
  minWidth: number;         // Minimum width needed for this family
}

// ============================================
// Render Types
// ============================================

export interface RenderOptions {
  width: number;
  height: number;
  padding: number;
  symbolSize: number;
  lineWidth: number;
  showLabels: boolean;
  showGenerationNumbers: boolean;
}

export interface ConnectionPath {
  type: 'spouse' | 'parent-child' | 'sibling' | 'twin' | 'indicator';
  from: { x: number; y: number };
  to: { x: number; y: number };
  isConsanguineous?: boolean;
  twinType?: TwinType;
  // For clickable connections
  relationshipId?: string;
  clickableArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a UUID that works in non-secure contexts (HTTP)
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (secure context)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// Factory Functions
// ============================================

export function createDefaultPersonStatus(): PersonStatus {
  return {
    isDeceased: false,
    isProband: false,
    isAdopted: false,
    isAdoptedIn: false,
    isAdoptedOut: false,
    isMiscarriage: false,
    isStillbirth: false,
    isPregnancy: false,
    isInfertile: false,
  };
}

export function createDefaultPersonMetadata(): PersonMetadata {
  return {};
}

export function createPerson(
  id: string,
  familyId: string,
  sex: Sex = Sex.Unknown
): Person {
  return {
    id,
    familyId,
    sex,
    phenotypes: [Phenotype.Unknown],
    status: createDefaultPersonStatus(),
    metadata: createDefaultPersonMetadata(),
    fatherId: null,
    motherId: null,
    spouseIds: [],
    childrenIds: [],
    twinType: TwinType.None,
    twinGroupId: null,
  };
}

export function createPedigree(familyId: string): Pedigree {
  return {
    id: generateUUID(),
    familyId,
    persons: new Map(),
    relationships: new Map(),
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: '1.0.0',
    },
  };
}

export function createRelationship(
  person1Id: string,
  person2Id: string,
  type: RelationshipType = RelationshipType.Spouse
): Relationship {
  return {
    id: generateUUID(),
    type,
    person1Id,
    person2Id,
    childrenIds: [],
  };
}

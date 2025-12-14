/**
 * GATK PED File Parser
 *
 * Parses the standard 6-column PED format:
 * Column 1: Family ID
 * Column 2: Individual ID
 * Column 3: Paternal ID (0 = unknown/founder)
 * Column 4: Maternal ID (0 = unknown/founder)
 * Column 5: Sex (1 = male, 2 = female, other = unknown)
 * Column 6: Phenotype (0/-9 = unknown, 1 = unaffected, 2 = affected)
 *
 * @see https://gatk.broadinstitute.org/hc/en-us/articles/360035531972-PED-Pedigree-format
 */

import {
  type PedRecord,
  type PedParseResult,
  type PedParseError,
  type Person,
  type Pedigree,
  type Relationship,
  Sex,
  Phenotype,
  RelationshipType,
  createPerson,
  createPedigree,
  createRelationship,
} from '@/core/model/types';

export class PedParser {
  /**
   * Parse PED file content into records
   */
  parse(content: string): PedParseResult {
    const lines = content.split(/\r?\n/);
    const records: PedRecord[] = [];
    const errors: PedParseError[] = [];
    const warnings: string[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      try {
        const record = this.parseLine(trimmedLine, lineNumber);
        records.push(record);
      } catch (error) {
        errors.push({
          line: lineNumber,
          message: error instanceof Error ? error.message : 'Unknown error',
          rawLine: line,
        });
      }
    });

    // Validate relationships
    const validationWarnings = this.validateRecords(records);
    warnings.push(...validationWarnings);

    return { records, errors, warnings };
  }

  /**
   * Parse a single line of PED file
   */
  private parseLine(line: string, lineNumber: number): PedRecord {
    const fields = line.split(/\s+/);

    if (fields.length < 6) {
      throw new Error(
        `Invalid PED format: expected at least 6 columns, got ${fields.length}`
      );
    }

    const [familyId, individualId, paternalId, maternalId, rawSex, rawPhenotype] = fields;

    // Validate IDs don't start with #
    if (familyId.startsWith('#') || individualId.startsWith('#')) {
      throw new Error('IDs cannot start with #');
    }

    return {
      familyId,
      individualId,
      paternalId,
      maternalId,
      sex: this.parseSex(rawSex),
      phenotype: this.parsePhenotype(rawPhenotype),
      rawSex,
      rawPhenotype,
    };
  }

  /**
   * Parse sex field
   * 1 = male, 2 = female, other = unknown
   */
  private parseSex(value: string): Sex {
    switch (value) {
      case '1':
        return Sex.Male;
      case '2':
        return Sex.Female;
      default:
        return Sex.Unknown;
    }
  }

  /**
   * Parse phenotype field
   * 0, -9 = unknown
   * 1 = unaffected
   * 2 = affected
   */
  private parsePhenotype(value: string): Phenotype {
    switch (value) {
      case '1':
        return Phenotype.Unaffected;
      case '2':
        return Phenotype.Affected;
      case '0':
      case '-9':
      default:
        return Phenotype.Unknown;
    }
  }

  /**
   * Validate records for consistency
   */
  private validateRecords(records: PedRecord[]): string[] {
    const warnings: string[] = [];
    const idSet = new Set<string>();
    const fullIdSet = new Set<string>();

    for (const record of records) {
      const fullId = `${record.familyId}:${record.individualId}`;

      // Check for duplicate IDs within family
      if (fullIdSet.has(fullId)) {
        warnings.push(
          `Duplicate individual ID: ${record.individualId} in family ${record.familyId}`
        );
      }
      fullIdSet.add(fullId);
      idSet.add(record.individualId);
    }

    // Check parent references
    for (const record of records) {
      if (record.paternalId !== '0' && !idSet.has(record.paternalId)) {
        warnings.push(
          `Father ${record.paternalId} of ${record.individualId} not found in pedigree`
        );
      }
      if (record.maternalId !== '0' && !idSet.has(record.maternalId)) {
        warnings.push(
          `Mother ${record.maternalId} of ${record.individualId} not found in pedigree`
        );
      }
    }

    return warnings;
  }

  /**
   * Convert parsed records to a Pedigree structure
   */
  recordsToPedigree(records: PedRecord[]): Pedigree {
    if (records.length === 0) {
      return createPedigree('unknown');
    }

    const familyId = records[0].familyId;
    const pedigree = createPedigree(familyId);

    // First pass: create all persons
    for (const record of records) {
      const person = createPerson(record.individualId, record.familyId, record.sex);
      person.phenotypes = [record.phenotype];
      pedigree.persons.set(person.id, person);
    }

    // Second pass: establish relationships
    for (const record of records) {
      const person = pedigree.persons.get(record.individualId);
      if (!person) continue;

      // Set parent references
      if (record.paternalId !== '0') {
        person.fatherId = record.paternalId;
        const father = pedigree.persons.get(record.paternalId);
        if (father) {
          father.childrenIds.push(person.id);
        }
      }

      if (record.maternalId !== '0') {
        person.motherId = record.maternalId;
        const mother = pedigree.persons.get(record.maternalId);
        if (mother) {
          mother.childrenIds.push(person.id);
        }
      }
    }

    // Third pass: create spouse relationships
    const spouseMap = new Map<string, Set<string>>();

    for (const person of pedigree.persons.values()) {
      if (person.fatherId && person.motherId) {
        const key = [person.fatherId, person.motherId].sort().join(':');
        if (!spouseMap.has(key)) {
          spouseMap.set(key, new Set());
        }
        spouseMap.get(key)!.add(person.id);
      }
    }

    for (const [key, childrenIds] of spouseMap) {
      const [person1Id, person2Id] = key.split(':');

      // Check if relationship already exists
      const existingRel = Array.from(pedigree.relationships.values()).find(
        r =>
          (r.person1Id === person1Id && r.person2Id === person2Id) ||
          (r.person1Id === person2Id && r.person2Id === person1Id)
      );

      if (!existingRel) {
        const relationship = createRelationship(person1Id, person2Id);
        relationship.childrenIds = Array.from(childrenIds);
        pedigree.relationships.set(relationship.id, relationship);

        // Update spouse references
        const person1 = pedigree.persons.get(person1Id);
        const person2 = pedigree.persons.get(person2Id);
        if (person1 && !person1.spouseIds.includes(person2Id)) {
          person1.spouseIds.push(person2Id);
        }
        if (person2 && !person2.spouseIds.includes(person1Id)) {
          person2.spouseIds.push(person1Id);
        }
      }
    }

    return pedigree;
  }

  /**
   * Convenience method to parse content directly to Pedigree
   */
  parseToPedigree(content: string): { pedigree: Pedigree; result: PedParseResult } {
    const result = this.parse(content);
    const pedigree = this.recordsToPedigree(result.records);
    return { pedigree, result };
  }
}

export const pedParser = new PedParser();

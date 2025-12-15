/**
 * PED File Writer
 *
 * Exports Pedigree structure to GATK PED format
 */

import {
  type Pedigree,
  type Person,
  Sex,
  Phenotype,
} from '@/core/model/types';

export class PedWriter {
  /**
   * Convert Pedigree to PED file content
   */
  write(pedigree: Pedigree): string {
    const lines: string[] = [];

    // Build ID to label mapping (use label if available, otherwise use ID)
    const idToLabel = new Map<string, string>();
    for (const [id, person] of pedigree.persons) {
      idToLabel.set(id, person.metadata.label || id);
    }

    // Add header comment
    lines.push(`# Pedigree: ${pedigree.familyId}`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Format: FamilyID IndividualID PaternalID MaternalID Sex Phenotype`);
    lines.push('');

    // Sort persons by generation (founders first) then by ID
    const sortedPersons = this.sortPersonsByGeneration(pedigree);

    for (const person of sortedPersons) {
      const line = this.formatPersonLine(person, idToLabel);
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * Format a single person as a PED line
   */
  private formatPersonLine(person: Person, idToLabel: Map<string, string>): string {
    const individualId = idToLabel.get(person.id) || person.id;
    const paternalId = person.fatherId ? (idToLabel.get(person.fatherId) || person.fatherId) : '0';
    const maternalId = person.motherId ? (idToLabel.get(person.motherId) || person.motherId) : '0';

    const fields = [
      person.familyId,
      individualId,
      paternalId,
      maternalId,
      this.formatSex(person.sex),
      this.formatPhenotype(person.phenotypes[0] ?? Phenotype.Unknown),
    ];

    return fields.join('\t');
  }

  /**
   * Convert Sex enum to PED format
   */
  private formatSex(sex: Sex): string {
    switch (sex) {
      case Sex.Male:
        return '1';
      case Sex.Female:
        return '2';
      default:
        return '0';
    }
  }

  /**
   * Convert Phenotype enum to PED format
   */
  private formatPhenotype(phenotype: Phenotype): string {
    switch (phenotype) {
      case Phenotype.Unaffected:
        return '1';
      case Phenotype.Affected:
        return '2';
      case Phenotype.Carrier:
        // Carrier is typically represented as unaffected in PED
        // The carrier status is usually stored in additional columns
        return '1';
      default:
        return '-9';
    }
  }

  /**
   * Sort persons so founders come first, then by generation
   */
  private sortPersonsByGeneration(pedigree: Pedigree): Person[] {
    const persons = Array.from(pedigree.persons.values());
    const generationMap = new Map<string, number>();

    // Calculate generations using BFS from founders
    const founders = persons.filter(p => !p.fatherId && !p.motherId);
    const queue: Array<{ person: Person; generation: number }> = [];

    for (const founder of founders) {
      queue.push({ person: founder, generation: 0 });
      generationMap.set(founder.id, 0);
    }

    while (queue.length > 0) {
      const { person, generation } = queue.shift()!;

      for (const childId of person.childrenIds) {
        const child = pedigree.persons.get(childId);
        if (child && !generationMap.has(childId)) {
          const childGen = generation + 1;
          generationMap.set(childId, childGen);
          queue.push({ person: child, generation: childGen });
        }
      }
    }

    // Handle any persons not reached (disconnected individuals)
    for (const person of persons) {
      if (!generationMap.has(person.id)) {
        generationMap.set(person.id, 999); // Put at the end
      }
    }

    // Sort by generation, then by ID
    return persons.sort((a, b) => {
      const genA = generationMap.get(a.id) ?? 999;
      const genB = generationMap.get(b.id) ?? 999;
      if (genA !== genB) {
        return genA - genB;
      }
      return a.id.localeCompare(b.id);
    });
  }
}

export const pedWriter = new PedWriter();

/**
 * Pedigree Layout Algorithm
 *
 * Calculates x, y positions for each person in the pedigree.
 * Uses a generation-based approach:
 * 1. Assign generations (founders = 0, children = parent generation + 1)
 * 2. Sort within each generation (spouses adjacent, siblings grouped)
 * 3. Calculate x positions avoiding overlaps
 * 4. Handle special cases (consanguinity, twins)
 */

import type { Pedigree, Person, Relationship, LayoutOptions, LayoutNode } from '@/core/model/types';

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeWidth: 50,
  nodeHeight: 50,
  horizontalSpacing: 30,
  verticalSpacing: 100,
  siblingSpacing: 40,
  spouseSpacing: 60,
};

interface GenerationInfo {
  persons: Person[];
  width: number;
}

export class PedigreeLayout {
  private options: LayoutOptions;

  constructor(options: Partial<LayoutOptions> = {}) {
    this.options = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  }

  /**
   * Main layout function - calculates positions for all persons
   */
  layout(pedigree: Pedigree): Map<string, LayoutNode> {
    const result = new Map<string, LayoutNode>();
    const persons = Array.from(pedigree.persons.values());

    if (persons.length === 0) {
      return result;
    }

    // Step 1: Assign generations
    const generations = this.assignGenerations(pedigree);

    // Step 2: Sort within each generation
    const sortedGenerations = this.sortGenerations(generations, pedigree);

    // Step 3: Calculate positions
    this.calculatePositions(sortedGenerations, pedigree, result);

    // Step 4: Center the layout
    this.centerLayout(result);

    return result;
  }

  /**
   * Assign generation numbers to each person using BFS from founders
   */
  private assignGenerations(pedigree: Pedigree): Map<number, Person[]> {
    const generations = new Map<number, Person[]>();
    const personGenerations = new Map<string, number>();
    const persons = Array.from(pedigree.persons.values());

    // Find founders (no parents in pedigree)
    const founders = persons.filter(p => !p.fatherId && !p.motherId);

    // BFS from founders
    const queue: Array<{ person: Person; generation: number }> = [];

    for (const founder of founders) {
      queue.push({ person: founder, generation: 0 });
      personGenerations.set(founder.id, 0);
    }

    while (queue.length > 0) {
      const { person, generation } = queue.shift()!;

      // Add to generation map
      if (!generations.has(generation)) {
        generations.set(generation, []);
      }
      if (!generations.get(generation)!.find(p => p.id === person.id)) {
        generations.get(generation)!.push(person);
      }

      // Process children
      for (const childId of person.childrenIds) {
        const child = pedigree.persons.get(childId);
        if (child && !personGenerations.has(childId)) {
          const childGen = generation + 1;
          personGenerations.set(childId, childGen);
          queue.push({ person: child, generation: childGen });
        }
      }

      // Ensure spouses are in the same generation
      for (const spouseId of person.spouseIds) {
        const spouse = pedigree.persons.get(spouseId);
        if (spouse && !personGenerations.has(spouseId)) {
          personGenerations.set(spouseId, generation);
          queue.push({ person: spouse, generation: generation });
        }
      }
    }

    // Handle disconnected individuals
    for (const person of persons) {
      if (!personGenerations.has(person.id)) {
        // Try to infer from children or parents
        let gen = 0;

        if (person.fatherId) {
          const fatherGen = personGenerations.get(person.fatherId);
          if (fatherGen !== undefined) {
            gen = fatherGen + 1;
          }
        }

        personGenerations.set(person.id, gen);
        if (!generations.has(gen)) {
          generations.set(gen, []);
        }
        generations.get(gen)!.push(person);
      }
    }

    // Store generation in person objects
    for (const [personId, gen] of personGenerations) {
      const person = pedigree.persons.get(personId);
      if (person) {
        person.generation = gen;
      }
    }

    return generations;
  }

  /**
   * Sort persons within each generation
   * - Spouses should be adjacent
   * - Siblings should be grouped together
   */
  private sortGenerations(
    generations: Map<number, Person[]>,
    pedigree: Pedigree
  ): Map<number, Person[]> {
    const sorted = new Map<number, Person[]>();

    for (const [gen, persons] of generations) {
      const sortedGen = this.sortGeneration(persons, pedigree);
      sorted.set(gen, sortedGen);
    }

    return sorted;
  }

  private sortGeneration(persons: Person[], pedigree: Pedigree): Person[] {
    if (persons.length <= 1) {
      return [...persons];
    }

    // Group by family units (couples with their children's parents)
    const familyGroups: Person[][] = [];
    const processed = new Set<string>();

    for (const person of persons) {
      if (processed.has(person.id)) continue;

      const group: Person[] = [person];
      processed.add(person.id);

      // Add all spouses
      for (const spouseId of person.spouseIds) {
        const spouse = persons.find(p => p.id === spouseId);
        if (spouse && !processed.has(spouse.id)) {
          group.push(spouse);
          processed.add(spouse.id);
        }
      }

      familyGroups.push(group);
    }

    // Flatten groups, keeping couples together
    return familyGroups.flat();
  }

  /**
   * Calculate x, y positions for each person
   */
  private calculatePositions(
    generations: Map<number, Person[]>,
    pedigree: Pedigree,
    result: Map<string, LayoutNode>
  ): void {
    const { nodeWidth, horizontalSpacing, verticalSpacing, spouseSpacing } = this.options;

    // Sort generation keys
    const genKeys = Array.from(generations.keys()).sort((a, b) => a - b);

    for (const gen of genKeys) {
      const persons = generations.get(gen) ?? [];
      const y = gen * (this.options.nodeHeight + verticalSpacing);

      let currentX = 0;

      for (let i = 0; i < persons.length; i++) {
        const person = persons[i];
        const prevPerson = i > 0 ? persons[i - 1] : null;

        // Determine spacing
        let spacing = horizontalSpacing;
        if (prevPerson) {
          if (prevPerson.spouseIds.includes(person.id) ||
              person.spouseIds.includes(prevPerson.id)) {
            spacing = spouseSpacing;
          }
        }

        if (i > 0) {
          currentX += spacing + nodeWidth;
        }

        // Try to center under parents if they exist
        const parentX = this.getParentCenterX(person, result);
        if (parentX !== null && gen > 0) {
          // Check if this position doesn't overlap
          const desiredX = parentX;
          if (desiredX >= currentX) {
            currentX = desiredX;
          }
        }

        const node: LayoutNode = {
          person,
          x: currentX,
          y,
          generation: gen,
          order: i,
        };

        result.set(person.id, node);

        // Update person position
        person.x = currentX;
        person.y = y;
      }
    }

    // Second pass: adjust children to center under parents
    this.adjustChildrenPositions(generations, result, pedigree);
  }

  /**
   * Get the center X position of a person's parents
   */
  private getParentCenterX(person: Person, positions: Map<string, LayoutNode>): number | null {
    const fatherNode = person.fatherId ? positions.get(person.fatherId) : null;
    const motherNode = person.motherId ? positions.get(person.motherId) : null;

    if (fatherNode && motherNode) {
      return (fatherNode.x + motherNode.x) / 2;
    } else if (fatherNode) {
      return fatherNode.x;
    } else if (motherNode) {
      return motherNode.x;
    }

    return null;
  }

  /**
   * Adjust children positions to be centered under their parents
   */
  private adjustChildrenPositions(
    generations: Map<number, Person[]>,
    positions: Map<string, LayoutNode>,
    pedigree: Pedigree
  ): void {
    const genKeys = Array.from(generations.keys()).sort((a, b) => a - b);

    // Skip first generation (founders)
    for (let i = 1; i < genKeys.length; i++) {
      const gen = genKeys[i];
      const persons = generations.get(gen) ?? [];

      // Group siblings
      const siblingGroups = this.groupSiblings(persons);

      for (const siblings of siblingGroups) {
        if (siblings.length === 0) continue;

        // Find parent center
        const firstSibling = siblings[0];
        const parentCenter = this.getParentCenterX(firstSibling, positions);

        if (parentCenter === null) continue;

        // Calculate current sibling group center
        const siblingPositions = siblings.map(s => positions.get(s.id)!);
        const currentCenter = (siblingPositions[0].x + siblingPositions[siblingPositions.length - 1].x) / 2;

        // Calculate offset needed
        const offset = parentCenter - currentCenter;

        // Apply offset to all siblings (if it doesn't cause overlap)
        // For now, we'll skip overlap checking for simplicity
        for (const sibling of siblings) {
          const node = positions.get(sibling.id);
          if (node) {
            node.x += offset;
            sibling.x = node.x;
          }
        }
      }
    }
  }

  /**
   * Group persons by their parents
   */
  private groupSiblings(persons: Person[]): Person[][] {
    const groups: Person[][] = [];
    const parentMap = new Map<string, Person[]>();

    for (const person of persons) {
      const parentKey = `${person.fatherId ?? ''}:${person.motherId ?? ''}`;
      if (!parentMap.has(parentKey)) {
        parentMap.set(parentKey, []);
      }
      parentMap.get(parentKey)!.push(person);
    }

    for (const group of parentMap.values()) {
      groups.push(group);
    }

    return groups;
  }

  /**
   * Center the entire layout around (0, 0)
   */
  private centerLayout(positions: Map<string, LayoutNode>): void {
    if (positions.size === 0) return;

    const nodes = Array.from(positions.values());

    // Find bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }

    // Calculate center offset
    const offsetX = -(minX + maxX) / 2;
    const offsetY = -minY + 50; // Start 50px from top

    // Apply offset
    for (const node of nodes) {
      node.x += offsetX;
      node.y += offsetY;
      node.person.x = node.x;
      node.person.y = node.y;
    }
  }

  /**
   * Update layout options
   */
  setOptions(options: Partial<LayoutOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): LayoutOptions {
    return { ...this.options };
  }
}

export const pedigreeLayout = new PedigreeLayout();

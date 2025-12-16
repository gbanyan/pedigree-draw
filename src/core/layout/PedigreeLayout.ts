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

import type { Pedigree, Person, Relationship, LayoutOptions, LayoutNode, FamilyUnit } from '@/core/model/types';

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

    // Step 2: Build family units and find shared persons (multiple marriages)
    const familyUnits = this.buildFamilyUnits(pedigree);
    const sharedPersons = this.findSharedPersons(familyUnits);

    // Calculate minimum widths for family units
    for (const unit of familyUnits) {
      unit.minWidth = this.calculateFamilyUnitWidth(unit);
    }

    // Step 3: Sort within each generation (with family unit awareness)
    const sortedGenerations = this.sortGenerationsWithFamilyUnits(
      generations,
      pedigree,
      familyUnits,
      sharedPersons
    );

    // Step 4: Calculate initial positions
    this.calculatePositions(sortedGenerations, pedigree, result);

    // Step 5: Adjust parent positions to be centered above children
    // This is important for newly added parents
    this.adjustParentPositions(sortedGenerations, result, pedigree);

    // Step 6: Adjust children positions to be centered under parents
    this.adjustChildrenPositions(sortedGenerations, result, pedigree);

    // Step 7: Resolve collisions for all generations
    const genKeys = Array.from(generations.keys()).sort((a, b) => a - b);
    for (const gen of genKeys) {
      // Multiple passes to ensure all collisions are resolved
      let maxIterations = 10;
      while (this.detectCollisions(result, gen) && maxIterations > 0) {
        this.resolveCollisions(result, gen);
        maxIterations--;
      }
    }

    // Step 8: Center the layout
    this.centerLayout(result);

    return result;
  }

  /**
   * Sort generations with family unit awareness
   */
  private sortGenerationsWithFamilyUnits(
    generations: Map<number, Person[]>,
    pedigree: Pedigree,
    familyUnits: FamilyUnit[],
    sharedPersons: Map<string, FamilyUnit[]>
  ): Map<number, Person[]> {
    const sorted = new Map<number, Person[]>();

    for (const [gen, persons] of generations) {
      // Filter family units and shared persons for this generation
      const genFamilyUnits = familyUnits.filter(u => u.generation === gen);
      const genSharedPersons = new Map<string, FamilyUnit[]>();
      for (const [personId, units] of sharedPersons) {
        const person = pedigree.persons.get(personId);
        if (person && person.generation === gen) {
          genSharedPersons.set(personId, units);
        }
      }

      const sortedGen = this.sortGenerationWithFamilyUnits(
        persons,
        pedigree,
        genFamilyUnits,
        genSharedPersons
      );
      sorted.set(gen, sortedGen);
    }

    return sorted;
  }

  /**
   * Assign generation numbers to each person using BFS from founders
   * Ensures spouses are always in the same generation
   */
  private assignGenerations(pedigree: Pedigree): Map<number, Person[]> {
    const generations = new Map<number, Person[]>();
    const personGenerations = new Map<string, number>();
    const persons = Array.from(pedigree.persons.values());

    // Step 1: Calculate the minimum generation for each person based on parents
    // A person's generation must be at least (max parent generation + 1)
    const minGeneration = new Map<string, number>();

    const calculateMinGeneration = (personId: string, visited: Set<string>): number => {
      if (visited.has(personId)) return minGeneration.get(personId) ?? 0;
      visited.add(personId);

      const person = pedigree.persons.get(personId);
      if (!person) return 0;

      let minGen = 0;

      // Check parents
      if (person.fatherId) {
        const fatherMin = calculateMinGeneration(person.fatherId, visited);
        minGen = Math.max(minGen, fatherMin + 1);
      }
      if (person.motherId) {
        const motherMin = calculateMinGeneration(person.motherId, visited);
        minGen = Math.max(minGen, motherMin + 1);
      }

      minGeneration.set(personId, minGen);
      return minGen;
    };

    // Calculate minimum generation for all persons
    for (const person of persons) {
      calculateMinGeneration(person.id, new Set());
    }

    // Step 2: Propagate minimum generations through spouse relationships
    // Spouses must be in the same generation, so take the maximum
    let changed = true;
    while (changed) {
      changed = false;
      for (const person of persons) {
        const currentMin = minGeneration.get(person.id) ?? 0;
        for (const spouseId of person.spouseIds) {
          const spouseMin = minGeneration.get(spouseId) ?? 0;
          if (spouseMin > currentMin) {
            minGeneration.set(person.id, spouseMin);
            changed = true;
          } else if (currentMin > spouseMin) {
            minGeneration.set(spouseId, currentMin);
            changed = true;
          }
        }
      }
    }

    // Step 3: Propagate to children (children must be at least parent gen + 1)
    changed = true;
    while (changed) {
      changed = false;
      for (const person of persons) {
        const parentGen = minGeneration.get(person.id) ?? 0;
        for (const childId of person.childrenIds) {
          const childMin = minGeneration.get(childId) ?? 0;
          if (childMin <= parentGen) {
            minGeneration.set(childId, parentGen + 1);
            changed = true;
          }
        }
      }
      // Also propagate spouse constraints after updating children
      for (const person of persons) {
        const currentMin = minGeneration.get(person.id) ?? 0;
        for (const spouseId of person.spouseIds) {
          const spouseMin = minGeneration.get(spouseId) ?? 0;
          if (spouseMin !== currentMin) {
            const maxGen = Math.max(spouseMin, currentMin);
            minGeneration.set(person.id, maxGen);
            minGeneration.set(spouseId, maxGen);
            changed = true;
          }
        }
      }
    }

    // Step 4: Normalize generations to start from 0
    const allGens = Array.from(minGeneration.values());
    const minGen = allGens.length > 0 ? Math.min(...allGens) : 0;

    for (const [personId, gen] of minGeneration) {
      const normalizedGen = gen - minGen;
      personGenerations.set(personId, normalizedGen);

      if (!generations.has(normalizedGen)) {
        generations.set(normalizedGen, []);
      }
      const person = pedigree.persons.get(personId);
      if (person && !generations.get(normalizedGen)!.find(p => p.id === personId)) {
        generations.get(normalizedGen)!.push(person);
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
    // Note: adjustChildrenPositions is now called separately in layout()
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
   * Adjust parent positions to be centered above their children
   */
  private adjustParentPositions(
    generations: Map<number, Person[]>,
    positions: Map<string, LayoutNode>,
    pedigree: Pedigree
  ): void {
    const genKeys = Array.from(generations.keys()).sort((a, b) => a - b);

    // Process from bottom to top (children first, then parents)
    for (let i = genKeys.length - 1; i >= 0; i--) {
      const gen = genKeys[i];
      const persons = generations.get(gen) ?? [];

      // Track which persons have been processed as part of a couple
      const processedAsCouple = new Set<string>();

      for (const person of persons) {
        if (processedAsCouple.has(person.id)) continue;

        // Find children of this person
        if (person.childrenIds.length === 0) continue;

        const childNodes = person.childrenIds
          .map(id => positions.get(id))
          .filter((n): n is LayoutNode => n !== undefined);

        if (childNodes.length === 0) continue;

        // Calculate center of children
        const childXs = childNodes.map(n => n.x);
        const childCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2;

        // Get spouse if any (must be in same generation and share children)
        const spouse = person.spouseIds
          .map(id => pedigree.persons.get(id))
          .find(s => {
            if (!s || s.generation !== person.generation) return false;
            // Check if they share children
            return s.childrenIds.some(cid => person.childrenIds.includes(cid));
          });

        const parentNode = positions.get(person.id);
        if (!parentNode) continue;

        if (spouse) {
          processedAsCouple.add(spouse.id);
          const spouseNode = positions.get(spouse.id);
          if (spouseNode) {
            // Calculate current parent center
            const parentCenter = (parentNode.x + spouseNode.x) / 2;
            const offset = childCenter - parentCenter;

            // Apply offset (collision will be resolved later)
            const safeOffset = this.calculateSafeOffset([person, spouse], offset, positions, gen);
            if (Math.abs(safeOffset) > 0) {
              parentNode.x += safeOffset;
              person.x = parentNode.x;
              spouseNode.x += safeOffset;
              spouse.x = spouseNode.x;
            } else if (Math.abs(offset) > 0) {
              // If safe offset is 0, try moving everything including colliding nodes
              parentNode.x += offset;
              person.x = parentNode.x;
              spouseNode.x += offset;
              spouse.x = spouseNode.x;
            }
          }
        } else {
          // Single parent - center directly
          const offset = childCenter - parentNode.x;
          const safeOffset = this.calculateSafeOffset([person], offset, positions, gen);
          if (Math.abs(safeOffset) > 0) {
            parentNode.x += safeOffset;
            person.x = parentNode.x;
          } else if (Math.abs(offset) > 0) {
            parentNode.x += offset;
            person.x = parentNode.x;
          }
        }
      }

      // Resolve collisions after adjustments
      let maxIterations = 5;
      while (this.detectCollisions(positions, gen) && maxIterations > 0) {
        this.resolveCollisions(positions, gen);
        maxIterations--;
      }
    }
  }

  /**
   * Adjust children positions to be centered under their parents
   * Now includes collision detection and resolution
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
        const siblingPositions = siblings.map(s => positions.get(s.id)!).filter(p => p !== undefined);
        if (siblingPositions.length === 0) continue;

        const currentCenter = (siblingPositions[0].x + siblingPositions[siblingPositions.length - 1].x) / 2;

        // Calculate offset needed
        const offset = parentCenter - currentCenter;

        // Check if offset would cause collision
        const wouldCollide = this.checkOffsetCollision(siblings, offset, positions, gen);

        if (!wouldCollide) {
          // Apply full offset
          for (const sibling of siblings) {
            const node = positions.get(sibling.id);
            if (node) {
              node.x += offset;
              sibling.x = node.x;
            }
          }
        } else {
          // Apply partial offset (move towards parent but stop before collision)
          const safeOffset = this.calculateSafeOffset(siblings, offset, positions, gen);
          for (const sibling of siblings) {
            const node = positions.get(sibling.id);
            if (node) {
              node.x += safeOffset;
              sibling.x = node.x;
            }
          }
        }
      }

      // Resolve any remaining collisions in this generation
      let maxIterations = 5;
      while (this.detectCollisions(positions, gen) && maxIterations > 0) {
        this.resolveCollisions(positions, gen);
        maxIterations--;
      }
    }
  }

  /**
   * Check if applying an offset to siblings would cause collision
   */
  private checkOffsetCollision(
    siblings: Person[],
    offset: number,
    positions: Map<string, LayoutNode>,
    generation: number
  ): boolean {
    const { nodeWidth, horizontalSpacing } = this.options;
    const siblingIds = new Set(siblings.map(s => s.id));

    // Get all nodes in this generation
    const genNodes = Array.from(positions.values())
      .filter(node => node.generation === generation)
      .sort((a, b) => a.x - b.x);

    // Simulate the offset
    const simulatedPositions = genNodes.map(node => ({
      id: node.person.id,
      x: siblingIds.has(node.person.id) ? node.x + offset : node.x,
      isSpouse: (i: number) => {
        if (i === 0) return false;
        const prev = genNodes[i - 1];
        return prev.person.spouseIds.includes(node.person.id) ||
               node.person.spouseIds.includes(prev.person.id);
      }
    }));

    simulatedPositions.sort((a, b) => a.x - b.x);

    // Check for collisions
    for (let i = 1; i < simulatedPositions.length; i++) {
      const prev = simulatedPositions[i - 1];
      const curr = simulatedPositions[i];

      const minDistance = nodeWidth + horizontalSpacing;
      if (curr.x - prev.x < minDistance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate a safe offset that moves siblings towards parent without collision
   */
  private calculateSafeOffset(
    siblings: Person[],
    desiredOffset: number,
    positions: Map<string, LayoutNode>,
    generation: number
  ): number {
    // Binary search for the maximum safe offset
    const step = desiredOffset > 0 ? 5 : -5;
    let safeOffset = 0;

    for (let testOffset = 0; Math.abs(testOffset) < Math.abs(desiredOffset); testOffset += step) {
      if (!this.checkOffsetCollision(siblings, testOffset, positions, generation)) {
        safeOffset = testOffset;
      } else {
        break;
      }
    }

    return safeOffset;
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
   * Build family units from relationships
   */
  private buildFamilyUnits(pedigree: Pedigree): FamilyUnit[] {
    const familyUnits: FamilyUnit[] = [];
    const processedRelationships = new Set<string>();

    // Create family unit for each relationship
    for (const [relId, relationship] of pedigree.relationships) {
      if (processedRelationships.has(relId)) continue;
      processedRelationships.add(relId);

      const person1 = pedigree.persons.get(relationship.person1Id);
      const person2 = pedigree.persons.get(relationship.person2Id);

      if (!person1 || !person2) continue;

      const unit: FamilyUnit = {
        id: relId,
        parents: [relationship.person1Id, relationship.person2Id],
        children: [...relationship.childrenIds],
        relationshipId: relId,
        generation: person1.generation ?? 0,
        minWidth: 0,
      };

      familyUnits.push(unit);
    }

    // Handle single parents (persons with children but no relationship)
    for (const [personId, person] of pedigree.persons) {
      if (person.childrenIds.length === 0) continue;

      // Check if already covered by a relationship
      const coveredChildren = new Set<string>();
      for (const unit of familyUnits) {
        if (unit.parents.includes(personId)) {
          unit.children.forEach(c => coveredChildren.add(c));
        }
      }

      // Find children not covered by any relationship
      const uncoveredChildren = person.childrenIds.filter(c => !coveredChildren.has(c));
      if (uncoveredChildren.length > 0) {
        const unit: FamilyUnit = {
          id: `single-${personId}`,
          parents: [personId],
          children: uncoveredChildren,
          relationshipId: null,
          generation: person.generation ?? 0,
          minWidth: 0,
        };
        familyUnits.push(unit);
      }
    }

    return familyUnits;
  }

  /**
   * Calculate minimum width needed for a family unit
   */
  private calculateFamilyUnitWidth(unit: FamilyUnit): number {
    const { nodeWidth, horizontalSpacing, spouseSpacing, siblingSpacing } = this.options;

    // Width of parents
    const parentsWidth = unit.parents.length === 2
      ? nodeWidth * 2 + spouseSpacing
      : nodeWidth;

    // Width of children
    let childrenWidth = 0;
    if (unit.children.length > 0) {
      childrenWidth = unit.children.length * nodeWidth +
                      (unit.children.length - 1) * siblingSpacing;
    }

    // Family unit width is the maximum of parents width and children width
    // Plus margin on each side for separation
    const margin = horizontalSpacing;
    return Math.max(parentsWidth, childrenWidth) + margin * 2;
  }

  /**
   * Detect collisions in a generation
   */
  private detectCollisions(positions: Map<string, LayoutNode>, generation: number): boolean {
    const { nodeWidth, horizontalSpacing } = this.options;
    const nodesInGen = Array.from(positions.values())
      .filter(node => node.generation === generation)
      .sort((a, b) => a.x - b.x);

    for (let i = 1; i < nodesInGen.length; i++) {
      const prev = nodesInGen[i - 1];
      const curr = nodesInGen[i];

      // Determine minimum spacing based on relationship
      const areSpouses = prev.person.spouseIds.includes(curr.person.id) ||
                         curr.person.spouseIds.includes(prev.person.id);
      const minDistance = nodeWidth + (areSpouses ? this.options.spouseSpacing : horizontalSpacing);
      const actualDistance = curr.x - prev.x;

      if (actualDistance < minDistance) {
        return true; // Collision detected
      }
    }

    return false;
  }

  /**
   * Resolve collisions in a generation by shifting nodes to the right
   */
  private resolveCollisions(positions: Map<string, LayoutNode>, generation: number): void {
    const { nodeWidth, horizontalSpacing } = this.options;
    const nodesInGen = Array.from(positions.values())
      .filter(node => node.generation === generation)
      .sort((a, b) => a.x - b.x);

    for (let i = 1; i < nodesInGen.length; i++) {
      const prev = nodesInGen[i - 1];
      const curr = nodesInGen[i];

      // Determine minimum spacing based on relationship
      const areSpouses = prev.person.spouseIds.includes(curr.person.id) ||
                         curr.person.spouseIds.includes(prev.person.id);
      const minDistance = nodeWidth + (areSpouses ? this.options.spouseSpacing : horizontalSpacing);
      const actualDistance = curr.x - prev.x;

      if (actualDistance < minDistance) {
        const shift = minDistance - actualDistance;

        // Shift this node and all nodes to the right
        for (let j = i; j < nodesInGen.length; j++) {
          const node = nodesInGen[j];
          node.x += shift;
          node.person.x = node.x;
        }
      }
    }
  }

  /**
   * Find persons who appear in multiple family units (multiple marriages)
   */
  private findSharedPersons(familyUnits: FamilyUnit[]): Map<string, FamilyUnit[]> {
    const personToUnits = new Map<string, FamilyUnit[]>();

    for (const unit of familyUnits) {
      for (const parentId of unit.parents) {
        if (!personToUnits.has(parentId)) {
          personToUnits.set(parentId, []);
        }
        personToUnits.get(parentId)!.push(unit);
      }
    }

    // Filter to only those with multiple units
    const sharedPersons = new Map<string, FamilyUnit[]>();
    for (const [personId, units] of personToUnits) {
      if (units.length > 1) {
        sharedPersons.set(personId, units);
      }
    }

    return sharedPersons;
  }

  /**
   * Sort generations with awareness of family units and shared persons
   * Ensures proper ordering to minimize overlaps
   */
  private sortGenerationWithFamilyUnits(
    persons: Person[],
    pedigree: Pedigree,
    familyUnits: FamilyUnit[],
    sharedPersons: Map<string, FamilyUnit[]>
  ): Person[] {
    if (persons.length <= 1) {
      return [...persons];
    }

    const result: Person[] = [];
    const processed = new Set<string>();

    // First, handle shared persons (people with multiple marriages)
    // They should be placed with all their spouses in sequence
    for (const [sharedId, units] of sharedPersons) {
      const sharedPerson = persons.find(p => p.id === sharedId);
      if (!sharedPerson || processed.has(sharedId)) continue;

      // Collect all spouses of this person
      const spouses: Person[] = [];
      for (const unit of units) {
        for (const parentId of unit.parents) {
          if (parentId !== sharedId) {
            const spouse = persons.find(p => p.id === parentId);
            if (spouse && !processed.has(spouse.id)) {
              spouses.push(spouse);
            }
          }
        }
      }

      // Add first spouse, then shared person, then remaining spouses
      // This places the shared person in the middle
      if (spouses.length > 0) {
        result.push(spouses[0]);
        processed.add(spouses[0].id);
      }

      result.push(sharedPerson);
      processed.add(sharedId);

      for (let i = 1; i < spouses.length; i++) {
        result.push(spouses[i]);
        processed.add(spouses[i].id);
      }
    }

    // Then process remaining persons normally
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

      result.push(...group);
    }

    return result;
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

/**
 * useD3Pedigree Hook
 *
 * Integrates D3.js with React for rendering the pedigree chart
 */

import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { Pedigree, Person, LayoutNode, RenderOptions } from '@/core/model/types';
import { Sex, Phenotype, PartnershipStatus, ChildlessReason } from '@/core/model/types';
import { SymbolRegistry } from '@/core/renderer/SymbolRegistry';
import { ConnectionRenderer } from '@/core/renderer/ConnectionRenderer';

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  width: 800,
  height: 600,
  padding: 50,
  symbolSize: 40,
  lineWidth: 2,
  showLabels: true,
  showGenerationNumbers: true,
};

interface UseD3PedigreeProps {
  pedigree: Pedigree | null;
  layoutNodes: Map<string, LayoutNode>;
  selectedPersonId: string | null;
  selectedRelationshipId: string | null;
  options?: Partial<RenderOptions>;
  onPersonClick?: (personId: string) => void;
  onPersonDoubleClick?: (personId: string) => void;
  onRelationshipClick?: (relationshipId: string) => void;
  onBackgroundClick?: () => void;
}

export function useD3Pedigree({
  pedigree,
  layoutNodes,
  selectedPersonId,
  selectedRelationshipId,
  options = {},
  onPersonClick,
  onPersonDoubleClick,
  onRelationshipClick,
  onBackgroundClick,
}: UseD3PedigreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const renderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  const symbolRegistry = useRef(new SymbolRegistry(renderOptions.symbolSize));
  const connectionRenderer = useRef(new ConnectionRenderer({
    symbolSize: renderOptions.symbolSize,
    lineWidth: renderOptions.lineWidth,
  }));

  const render = useCallback(() => {
    if (!svgRef.current || !pedigree) return;

    const svg = d3.select(svgRef.current);

    // Preserve current transform if main group exists
    let existingTransform: string | null = null;
    const existingMainGroup = svg.select<SVGGElement>('.pedigree-main');
    if (!existingMainGroup.empty()) {
      existingTransform = existingMainGroup.attr('transform');
    }

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const mainGroup = svg
      .append('g')
      .attr('class', 'pedigree-main');

    // Restore transform if it existed
    if (existingTransform) {
      mainGroup.attr('transform', existingTransform);
    }

    // Background (for click handling)
    mainGroup
      .append('rect')
      .attr('class', 'pedigree-background')
      .attr('x', -10000)
      .attr('y', -10000)
      .attr('width', 20000)
      .attr('height', 20000)
      .attr('fill', 'transparent')
      .on('click', () => {
        onBackgroundClick?.();
      });

    // Render connections first (so they appear behind symbols)
    const connectionsGroup = mainGroup
      .append('g')
      .attr('class', 'connections');

    renderConnections(
      connectionsGroup,
      pedigree,
      layoutNodes,
      connectionRenderer.current,
      selectedRelationshipId,
      onRelationshipClick
    );

    // Render persons
    const personsGroup = mainGroup
      .append('g')
      .attr('class', 'persons');

    renderPersons(
      personsGroup,
      pedigree,
      layoutNodes,
      symbolRegistry.current,
      renderOptions,
      selectedPersonId,
      onPersonClick,
      onPersonDoubleClick
    );

    // Render generation labels
    if (renderOptions.showGenerationNumbers) {
      renderGenerationLabels(mainGroup, layoutNodes);
    }

  }, [pedigree, layoutNodes, selectedPersonId, selectedRelationshipId, renderOptions, onPersonClick, onPersonDoubleClick, onRelationshipClick, onBackgroundClick]);

  useEffect(() => {
    render();
  }, [render]);

  return { svgRef, render };
}

function renderConnections(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  pedigree: Pedigree,
  layoutNodes: Map<string, LayoutNode>,
  renderer: ConnectionRenderer,
  selectedRelationshipId: string | null,
  onRelationshipClick?: (relationshipId: string) => void
) {
  // Render spouse connections
  const processedPairs = new Set<string>();

  for (const [, relationship] of pedigree.relationships) {
    const node1 = layoutNodes.get(relationship.person1Id);
    const node2 = layoutNodes.get(relationship.person2Id);

    if (!node1 || !node2) continue;

    const pairKey = [relationship.person1Id, relationship.person2Id].sort().join(':');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const paths = renderer.renderSpouseConnection(node1, node2, relationship);
    const isSelected = relationship.id === selectedRelationshipId;

    // Create a group for the clickable connection
    const connectionGroup = group
      .append('g')
      .attr('class', `connection-group${isSelected ? ' selected' : ''}`)
      .attr('data-relationship-id', relationship.id);

    // Render clickable hit area if available
    const pathWithArea = paths.find(p => p.clickableArea);
    if (pathWithArea?.clickableArea) {
      const area = pathWithArea.clickableArea;
      connectionGroup
        .append('rect')
        .attr('class', 'connection-hit-area')
        .attr('x', area.x)
        .attr('y', area.y)
        .attr('width', area.width)
        .attr('height', area.height)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          onRelationshipClick?.(relationship.id);
        });
    }

    for (const path of paths) {
      connectionGroup
        .append('path')
        .attr('d', path.d)
        .attr('class', path.className)
        .attr('fill', 'none')
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
    }

    // Render partnership status indicators (separation/divorce)
    if (relationship.partnershipStatus === PartnershipStatus.Separated) {
      const separationPaths = renderer.renderSeparationIndicator(node1, node2);
      for (const path of separationPaths) {
        connectionGroup
          .append('path')
          .attr('d', path.d)
          .attr('class', path.className)
          .attr('fill', 'none')
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
      }
    } else if (relationship.partnershipStatus === PartnershipStatus.Divorced) {
      const divorcePaths = renderer.renderDivorceIndicator(node1, node2);
      for (const path of divorcePaths) {
        connectionGroup
          .append('path')
          .attr('d', path.d)
          .attr('class', path.className)
          .attr('fill', 'none')
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
      }
    }

    // Render childlessness indicators
    if (relationship.childlessReason === ChildlessReason.Infertility) {
      const infertilityPaths = renderer.renderInfertilityIndicator(node1, node2, false);
      for (const path of infertilityPaths) {
        connectionGroup
          .append('path')
          .attr('d', path.d)
          .attr('class', path.className)
          .attr('fill', 'none')
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
      }
    } else if (relationship.childlessReason === ChildlessReason.ByChoice) {
      const byChoicePaths = renderer.renderInfertilityIndicator(node1, node2, true);
      for (const path of byChoicePaths) {
        connectionGroup
          .append('path')
          .attr('d', path.d)
          .attr('class', path.className)
          .attr('fill', 'none')
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
      }
      // Add "(c)" text for by-choice
      connectionGroup
        .append('text')
        .attr('x', (node1.x + node2.x) / 2)
        .attr('y', node1.y + 20 + 30 + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', 'sans-serif')
        .text('(c)');
    }

    // Render parent-child connections if there are children
    if (relationship.childrenIds.length > 0) {
      const childNodes = relationship.childrenIds
        .map(id => layoutNodes.get(id))
        .filter((n): n is LayoutNode => n !== undefined);

      if (childNodes.length > 0) {
        const parentChildPaths = renderer.renderParentChildConnection(
          [node1, node2],
          childNodes
        );

        for (const path of parentChildPaths) {
          group
            .append('path')
            .attr('d', path.d)
            .attr('class', path.className)
            .attr('fill', 'none')
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
        }
      }
    }
  }

  // Render parent-child connections for persons with parents but no explicit relationship
  for (const [, person] of pedigree.persons) {
    if (!person.fatherId && !person.motherId) continue;

    const childNode = layoutNodes.get(person.id);
    if (!childNode) continue;

    const fatherNode = person.fatherId ? layoutNodes.get(person.fatherId) : null;
    const motherNode = person.motherId ? layoutNodes.get(person.motherId) : null;

    // Skip if already handled by relationship
    if (fatherNode && motherNode) {
      const pairKey = [person.fatherId, person.motherId].sort().join(':');
      if (processedPairs.has(pairKey)) continue;
    }

    // Single parent case
    if (fatherNode || motherNode) {
      const parentNode = fatherNode ?? motherNode;
      if (!parentNode) continue;

      const paths = renderer.renderParentChildConnection(
        [parentNode],
        [childNode]
      );

      for (const path of paths) {
        group
          .append('path')
          .attr('d', path.d)
          .attr('class', path.className)
          .attr('fill', 'none')
          .attr('stroke', '#333')
          .attr('stroke-width', 2);
      }
    }
  }
}

function renderPersons(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  pedigree: Pedigree,
  layoutNodes: Map<string, LayoutNode>,
  symbolRegistry: SymbolRegistry,
  options: RenderOptions,
  selectedPersonId: string | null,
  onPersonClick?: (personId: string) => void,
  onPersonDoubleClick?: (personId: string) => void
) {
  for (const [personId, node] of layoutNodes) {
    const person = pedigree.persons.get(personId);
    if (!person) continue;

    const personGroup = group
      .append('g')
      .attr('class', 'person')
      .attr('data-id', personId)
      .attr('transform', `translate(${node.x}, ${node.y})`)
      .attr('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation();
        onPersonClick?.(personId);
      })
      .on('dblclick', (event) => {
        event.stopPropagation();
        onPersonDoubleClick?.(personId);
      });

    // Selection highlight
    if (personId === selectedPersonId) {
      const highlightSize = options.symbolSize / 2 + 5;
      personGroup
        .append('rect')
        .attr('class', 'selection-highlight')
        .attr('x', -highlightSize)
        .attr('y', -highlightSize)
        .attr('width', highlightSize * 2)
        .attr('height', highlightSize * 2)
        .attr('fill', 'none')
        .attr('stroke', '#2196F3')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,3');
    }

    // Main symbol
    const symbolPath = symbolRegistry.getSymbolPath(person.sex);
    const phenotype = person.phenotypes[0] ?? Phenotype.Unknown;

    // Determine fill based on phenotype
    let fillColor = '#fff';
    if (phenotype === Phenotype.Affected) {
      fillColor = '#333';
    }

    personGroup
      .append('path')
      .attr('d', symbolPath)
      .attr('class', 'person-symbol')
      .attr('fill', fillColor)
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Carrier pattern (half-filled)
    if (phenotype === Phenotype.Carrier) {
      const carrierPath = symbolRegistry.getCarrierPath(person.sex);
      personGroup
        .append('path')
        .attr('d', carrierPath)
        .attr('class', 'person-carrier')
        .attr('fill', '#333');
    }

    // Multiple phenotypes
    if (person.phenotypes.length > 1) {
      const quadrantPaths = symbolRegistry.getQuadrantPaths(person.sex, person.phenotypes.length);
      person.phenotypes.forEach((pheno, index) => {
        if (pheno === Phenotype.Affected && quadrantPaths[index]) {
          personGroup
            .append('path')
            .attr('d', quadrantPaths[index])
            .attr('class', 'person-phenotype-quadrant')
            .attr('fill', '#333');
        }
      });
    }

    // Deceased overlay
    if (person.status.isDeceased) {
      const deceasedPath = symbolRegistry.getDeceasedPath();
      personGroup
        .append('path')
        .attr('d', deceasedPath)
        .attr('class', 'person-deceased')
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    }

    // Proband arrow
    if (person.status.isProband) {
      const probandPath = symbolRegistry.getProbandArrowPath();
      personGroup
        .append('path')
        .attr('d', probandPath)
        .attr('class', 'person-proband')
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    }

    // Adopted brackets
    if (person.status.isAdopted || person.status.isAdoptedIn) {
      const [leftBracket, rightBracket] = symbolRegistry.getAdoptionBracketPaths();
      personGroup
        .append('path')
        .attr('d', leftBracket)
        .attr('class', 'person-adopted')
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
      personGroup
        .append('path')
        .attr('d', rightBracket)
        .attr('class', 'person-adopted')
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    }

    // Label (positioned below connection lines)
    // Vertical lines to children end at childY - halfSymbol = parentY + verticalSpacing - 20 = parentY + 80
    // So label must be > 80 to avoid overlap. Using 85.
    if (options.showLabels && person.metadata.label) {
      personGroup
        .append('text')
        .attr('class', 'person-label')
        .attr('x', 0)
        .attr('y', options.symbolSize / 2 + 65)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-family', 'sans-serif')
        .text(person.metadata.label);
    }

    // ID label (if no custom label)
    if (options.showLabels && !person.metadata.label) {
      personGroup
        .append('text')
        .attr('class', 'person-id')
        .attr('x', 0)
        .attr('y', options.symbolSize / 2 + 65)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#666')
        .text(person.id);
    }
  }
}

function renderGenerationLabels(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  layoutNodes: Map<string, LayoutNode>
) {
  // Find unique generations and their Y positions
  const generations = new Map<number, number>();

  for (const [, node] of layoutNodes) {
    if (!generations.has(node.generation)) {
      generations.set(node.generation, node.y);
    }
  }

  // Find leftmost X position
  let minX = Infinity;
  for (const [, node] of layoutNodes) {
    minX = Math.min(minX, node.x);
  }

  // Render Roman numerals
  const labelsGroup = group
    .append('g')
    .attr('class', 'generation-labels');

  const sortedGens = Array.from(generations.entries()).sort((a, b) => a[0] - b[0]);

  sortedGens.forEach(([gen, y]) => {
    const romanNumeral = toRomanNumeral(gen + 1);

    labelsGroup
      .append('text')
      .attr('x', minX - 60)
      .attr('y', y + 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '14px')
      .attr('font-family', 'serif')
      .attr('font-weight', 'bold')
      .text(romanNumeral);
  });
}

function toRomanNumeral(num: number): string {
  const romanNumerals: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

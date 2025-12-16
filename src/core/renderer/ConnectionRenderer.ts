/**
 * Connection Renderer
 *
 * Renders lines connecting family members:
 * - Spouse connections (horizontal line between spouses)
 * - Parent-child connections (vertical + horizontal lines)
 * - Sibling connections (horizontal line above siblings)
 * - Twin connections (converging lines for identical, angled for fraternal)
 * - Consanguineous marriages (double line)
 */

import type { Person, Relationship, TwinType, LayoutNode, PartnershipStatus } from '@/core/model/types';
import { RelationshipType, ChildlessReason } from '@/core/model/types';

export interface ConnectionConfig {
  lineWidth: number;
  doubleLineGap: number;
  childDropHeight: number;
  symbolSize: number;
}

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  lineWidth: 2,
  doubleLineGap: 4,
  childDropHeight: 50,  // Increased to leave room for labels above the connection lines
  symbolSize: 40,
};

export interface ConnectionPath {
  d: string;
  className: string;
  isDouble?: boolean;
  // For clickable connections
  relationshipId?: string;
  connectionType?: 'spouse' | 'parent-child' | 'sibling' | 'twin' | 'indicator';
  clickableArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class ConnectionRenderer {
  private config: ConnectionConfig;

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config };
  }

  /**
   * Generate spouse connection path
   */
  renderSpouseConnection(
    person1: LayoutNode,
    person2: LayoutNode,
    relationship?: Relationship
  ): ConnectionPath[] {
    const halfSymbol = this.config.symbolSize / 2;
    const hitPadding = 8; // Padding for click target

    // Ensure person1 is on the left
    const [left, right] = person1.x < person2.x
      ? [person1, person2]
      : [person2, person1];

    const y = left.y;
    const x1 = left.x + halfSymbol;
    const x2 = right.x - halfSymbol;

    const isConsanguineous = relationship?.type === RelationshipType.Consanguineous;
    const relationshipId = relationship?.id;

    // Calculate clickable area
    const clickableArea = {
      x: x1,
      y: y - hitPadding,
      width: x2 - x1,
      height: hitPadding * 2,
    };

    if (isConsanguineous) {
      const gap = this.config.doubleLineGap;
      return [
        {
          d: `M ${x1} ${y - gap} L ${x2} ${y - gap}`,
          className: 'connection-spouse connection-consanguineous',
          relationshipId,
          connectionType: 'spouse',
          clickableArea,
        },
        {
          d: `M ${x1} ${y + gap} L ${x2} ${y + gap}`,
          className: 'connection-spouse connection-consanguineous',
          relationshipId,
          connectionType: 'spouse',
          // Only one clickable area needed
        },
      ];
    }

    return [{
      d: `M ${x1} ${y} L ${x2} ${y}`,
      className: 'connection-spouse',
      relationshipId,
      connectionType: 'spouse',
      clickableArea,
    }];
  }

  /**
   * Generate parent-child connection paths
   * Returns paths for the vertical drop line and the child connection
   */
  renderParentChildConnection(
    parents: [LayoutNode, LayoutNode] | [LayoutNode],
    children: LayoutNode[]
  ): ConnectionPath[] {
    if (children.length === 0) return [];

    const paths: ConnectionPath[] = [];
    const halfSymbol = this.config.symbolSize / 2;
    const dropHeight = this.config.childDropHeight;

    // Calculate parent connection point
    let parentX: number;
    let parentY: number;

    if (parents.length === 2) {
      // Two parents - connect from the middle of the spouse line
      parentX = (parents[0].x + parents[1].x) / 2;
      parentY = parents[0].y;
    } else {
      // Single parent
      parentX = parents[0].x;
      parentY = parents[0].y;
    }

    const childY = children[0].y;
    const midY = parentY + dropHeight;

    // Vertical line from parent connection point (starts at spouse line level)
    paths.push({
      d: `M ${parentX} ${parentY} L ${parentX} ${midY}`,
      className: 'connection-parent-child',
    });

    // Sort children by x position
    const sortedChildren = [...children].sort((a, b) => a.x - b.x);

    if (sortedChildren.length === 1) {
      // Single child - direct vertical line
      const child = sortedChildren[0];
      paths.push({
        d: `M ${parentX} ${midY} L ${child.x} ${midY} L ${child.x} ${childY - halfSymbol}`,
        className: 'connection-parent-child',
      });
    } else {
      // Multiple children - horizontal line connecting all
      const leftX = sortedChildren[0].x;
      const rightX = sortedChildren[sortedChildren.length - 1].x;

      // Horizontal line
      paths.push({
        d: `M ${leftX} ${midY} L ${rightX} ${midY}`,
        className: 'connection-sibling',
      });

      // Connect parent line to sibling line if needed
      if (parentX < leftX || parentX > rightX) {
        // Parent is outside the children span
        const closestX = parentX < leftX ? leftX : rightX;
        paths.push({
          d: `M ${parentX} ${midY} L ${closestX} ${midY}`,
          className: 'connection-parent-child',
        });
      }

      // Vertical lines to each child
      for (const child of sortedChildren) {
        paths.push({
          d: `M ${child.x} ${midY} L ${child.x} ${childY - halfSymbol}`,
          className: 'connection-parent-child',
        });
      }
    }

    return paths;
  }

  /**
   * Generate twin connection paths
   */
  renderTwinConnection(
    twins: LayoutNode[],
    twinType: TwinType
  ): ConnectionPath[] {
    if (twins.length < 2) return [];

    const paths: ConnectionPath[] = [];
    const halfSymbol = this.config.symbolSize / 2;

    // Sort by x position
    const sorted = [...twins].sort((a, b) => a.x - b.x);

    // Calculate the convergence point
    const midX = (sorted[0].x + sorted[sorted.length - 1].x) / 2;
    const topY = sorted[0].y - halfSymbol - 20; // Above the symbols

    if (twinType === 'monozygotic') {
      // Identical twins - lines converge to a single point
      for (const twin of sorted) {
        paths.push({
          d: `M ${twin.x} ${twin.y - halfSymbol} L ${midX} ${topY}`,
          className: 'connection-twin connection-twin-monozygotic',
        });
      }
    } else if (twinType === 'dizygotic') {
      // Fraternal twins - lines stay separate at top
      const spread = 10;
      sorted.forEach((twin, index) => {
        const offset = (index - (sorted.length - 1) / 2) * spread;
        paths.push({
          d: `M ${twin.x} ${twin.y - halfSymbol} L ${midX + offset} ${topY}`,
          className: 'connection-twin connection-twin-dizygotic',
        });
      });
    }

    return paths;
  }

  /**
   * Generate no-children indicator (double line beneath spouse line)
   */
  renderNoChildrenIndicator(
    person1: LayoutNode,
    person2: LayoutNode
  ): ConnectionPath[] {
    const halfSymbol = this.config.symbolSize / 2;
    const y = person1.y + halfSymbol + 15;

    const [left, right] = person1.x < person2.x
      ? [person1, person2]
      : [person2, person1];

    const midX = (left.x + right.x) / 2;
    const lineWidth = 20;

    return [{
      d: `M ${midX - lineWidth / 2} ${y} L ${midX + lineWidth / 2} ${y}`,
      className: 'connection-no-children',
    }];
  }

  /**
   * Generate separation indicator (single diagonal line through spouse connection)
   */
  renderSeparationIndicator(
    person1: LayoutNode,
    person2: LayoutNode
  ): ConnectionPath[] {
    const midX = (person1.x + person2.x) / 2;
    const y = person1.y;
    const size = 8;

    return [{
      d: `M ${midX - size} ${y - size} L ${midX + size} ${y + size}`,
      className: 'connection-separation',
    }];
  }

  /**
   * Generate divorce indicator (double diagonal line through spouse connection)
   */
  renderDivorceIndicator(
    person1: LayoutNode,
    person2: LayoutNode
  ): ConnectionPath[] {
    const midX = (person1.x + person2.x) / 2;
    const y = person1.y;
    const size = 8;
    const gap = 4;

    return [
      {
        d: `M ${midX - size - gap} ${y - size} L ${midX + size - gap} ${y + size}`,
        className: 'connection-divorce',
      },
      {
        d: `M ${midX - size + gap} ${y - size} L ${midX + size + gap} ${y + size}`,
        className: 'connection-divorce',
      },
    ];
  }

  /**
   * Generate infertility indicator (vertical line + horizontal bar)
   * Per NSGC standard: vertical line down from spouse line with horizontal bar
   */
  renderInfertilityIndicator(
    person1: LayoutNode,
    person2: LayoutNode,
    isByChoice: boolean = false
  ): ConnectionPath[] {
    const halfSymbol = this.config.symbolSize / 2;
    const midX = (person1.x + person2.x) / 2;
    const y = person1.y;
    const verticalLength = 20;
    const barWidth = 16;

    const paths: ConnectionPath[] = [
      // Vertical line
      {
        d: `M ${midX} ${y + halfSymbol} L ${midX} ${y + halfSymbol + verticalLength}`,
        className: 'connection-infertility',
      },
      // Horizontal bar
      {
        d: `M ${midX - barWidth / 2} ${y + halfSymbol + verticalLength} L ${midX + barWidth / 2} ${y + halfSymbol + verticalLength}`,
        className: 'connection-infertility',
      },
    ];

    // Add "c" text indicator for by-choice (this will be rendered as a path hint)
    if (isByChoice) {
      paths.push({
        d: `M ${midX - 4} ${y + halfSymbol + verticalLength + 12} L ${midX + 4} ${y + halfSymbol + verticalLength + 12}`,
        className: 'connection-no-children',
        connectionType: 'indicator',
      });
    }

    return paths;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const connectionRenderer = new ConnectionRenderer();

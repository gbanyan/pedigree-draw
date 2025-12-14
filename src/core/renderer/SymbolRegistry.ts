/**
 * Symbol Registry
 *
 * Manages standard pedigree symbols following NSGC guidelines:
 * - Square: Male
 * - Circle: Female
 * - Diamond: Unknown sex
 * - Filled: Affected
 * - Half-filled: Carrier
 * - Diagonal line: Deceased
 * - Arrow: Proband
 */

import { Sex, Phenotype } from '@/core/model/types';

export interface SymbolDimensions {
  width: number;
  height: number;
}

export interface SymbolPaths {
  outline: string;
  fill?: string;
}

export class SymbolRegistry {
  private size: number;

  constructor(size: number = 40) {
    this.size = size;
  }

  /**
   * Get symbol path for a given sex
   */
  getSymbolPath(sex: Sex): string {
    const s = this.size;
    const half = s / 2;

    switch (sex) {
      case Sex.Male:
        // Square centered at origin
        return `M ${-half} ${-half} L ${half} ${-half} L ${half} ${half} L ${-half} ${half} Z`;

      case Sex.Female:
        // Circle centered at origin
        return this.circlePath(0, 0, half);

      case Sex.Unknown:
      default:
        // Diamond (rotated square) centered at origin
        return `M 0 ${-half} L ${half} 0 L 0 ${half} L ${-half} 0 Z`;
    }
  }

  /**
   * Get SVG path for a circle
   */
  private circlePath(cx: number, cy: number, r: number): string {
    // Using arc commands to draw a circle
    return `M ${cx - r} ${cy}
            A ${r} ${r} 0 1 0 ${cx + r} ${cy}
            A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
  }

  /**
   * Get carrier pattern (half-filled)
   * Returns the path for the filled half
   */
  getCarrierPath(sex: Sex): string {
    const s = this.size;
    const half = s / 2;

    switch (sex) {
      case Sex.Male:
        // Right half of square
        return `M 0 ${-half} L ${half} ${-half} L ${half} ${half} L 0 ${half} Z`;

      case Sex.Female:
        // Right half of circle using clip path approach
        // We'll return a half-circle path
        return `M 0 ${-half} A ${half} ${half} 0 0 1 0 ${half} Z`;

      case Sex.Unknown:
      default:
        // Right half of diamond
        return `M 0 ${-half} L ${half} 0 L 0 ${half} Z`;
    }
  }

  /**
   * Get quadrant paths for multiple phenotypes
   * @param numPhenotypes Number of phenotypes (2, 3, or 4)
   */
  getQuadrantPaths(sex: Sex, numPhenotypes: number): string[] {
    const s = this.size;
    const half = s / 2;

    if (numPhenotypes === 2) {
      // Left and right halves
      return [
        this.getLeftHalfPath(sex),
        this.getRightHalfPath(sex),
      ];
    }

    if (numPhenotypes === 4) {
      // Four quadrants
      return [
        this.getQuadrantPath(sex, 'top-left'),
        this.getQuadrantPath(sex, 'top-right'),
        this.getQuadrantPath(sex, 'bottom-right'),
        this.getQuadrantPath(sex, 'bottom-left'),
      ];
    }

    // Default to full shape
    return [this.getSymbolPath(sex)];
  }

  private getLeftHalfPath(sex: Sex): string {
    const half = this.size / 2;

    switch (sex) {
      case Sex.Male:
        return `M ${-half} ${-half} L 0 ${-half} L 0 ${half} L ${-half} ${half} Z`;
      case Sex.Female:
        return `M 0 ${-half} A ${half} ${half} 0 0 0 0 ${half} Z`;
      default:
        return `M 0 ${-half} L ${-half} 0 L 0 ${half} Z`;
    }
  }

  private getRightHalfPath(sex: Sex): string {
    const half = this.size / 2;

    switch (sex) {
      case Sex.Male:
        return `M 0 ${-half} L ${half} ${-half} L ${half} ${half} L 0 ${half} Z`;
      case Sex.Female:
        return `M 0 ${-half} A ${half} ${half} 0 0 1 0 ${half} Z`;
      default:
        return `M 0 ${-half} L ${half} 0 L 0 ${half} Z`;
    }
  }

  private getQuadrantPath(sex: Sex, quadrant: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'): string {
    const half = this.size / 2;

    // For simplicity, use square-based quadrants
    switch (quadrant) {
      case 'top-left':
        return `M ${-half} ${-half} L 0 ${-half} L 0 0 L ${-half} 0 Z`;
      case 'top-right':
        return `M 0 ${-half} L ${half} ${-half} L ${half} 0 L 0 0 Z`;
      case 'bottom-right':
        return `M 0 0 L ${half} 0 L ${half} ${half} L 0 ${half} Z`;
      case 'bottom-left':
        return `M ${-half} 0 L 0 0 L 0 ${half} L ${-half} ${half} Z`;
    }
  }

  /**
   * Get deceased overlay path (diagonal line)
   */
  getDeceasedPath(): string {
    const s = this.size;
    const half = s / 2;
    const extend = s * 0.2; // Extend beyond symbol

    return `M ${-half - extend} ${half + extend} L ${half + extend} ${-half - extend}`;
  }

  /**
   * Get proband arrow path
   */
  getProbandArrowPath(): string {
    const s = this.size;
    const half = s / 2;
    const arrowSize = s * 0.3;

    // Arrow pointing to bottom-left corner
    const startX = -half - s * 0.5;
    const startY = half + s * 0.5;
    const endX = -half - s * 0.1;
    const endY = half + s * 0.1;

    return `
      M ${startX} ${startY}
      L ${endX} ${endY}
      M ${endX} ${endY}
      L ${endX - arrowSize * 0.3} ${endY + arrowSize * 0.1}
      M ${endX} ${endY}
      L ${endX + arrowSize * 0.1} ${endY - arrowSize * 0.3}
    `;
  }

  /**
   * Get adoption bracket paths
   * Returns [left bracket, right bracket]
   */
  getAdoptionBracketPaths(): [string, string] {
    const s = this.size;
    const half = s / 2;
    const bracketWidth = s * 0.15;
    const bracketHeight = s * 0.2;

    const left = `
      M ${-half - bracketWidth} ${-half - bracketHeight}
      L ${-half - bracketWidth * 2} ${-half - bracketHeight}
      L ${-half - bracketWidth * 2} ${half + bracketHeight}
      L ${-half - bracketWidth} ${half + bracketHeight}
    `;

    const right = `
      M ${half + bracketWidth} ${-half - bracketHeight}
      L ${half + bracketWidth * 2} ${-half - bracketHeight}
      L ${half + bracketWidth * 2} ${half + bracketHeight}
      L ${half + bracketWidth} ${half + bracketHeight}
    `;

    return [left, right];
  }

  /**
   * Get miscarriage/stillbirth triangle path
   */
  getMiscarriageTrianglePath(): string {
    const s = this.size * 0.4; // Smaller than regular symbols
    const half = s / 2;

    return `M 0 ${-half} L ${half} ${half} L ${-half} ${half} Z`;
  }

  /**
   * Get pregnancy symbol path (diamond with P)
   */
  getPregnancyPath(): string {
    const s = this.size * 0.6;
    const half = s / 2;

    return `M 0 ${-half} L ${half} 0 L 0 ${half} L ${-half} 0 Z`;
  }

  /**
   * Get infertility line path
   */
  getInfertilityPath(): string {
    const s = this.size;
    const lineOffset = s * 0.7;

    return `M ${-s * 0.3} ${lineOffset} L ${s * 0.3} ${lineOffset}`;
  }

  /**
   * Update symbol size
   */
  setSize(size: number): void {
    this.size = size;
  }

  /**
   * Get current symbol size
   */
  getSize(): number {
    return this.size;
  }
}

export const symbolRegistry = new SymbolRegistry();

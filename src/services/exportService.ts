/**
 * Export Service
 *
 * Handles exporting pedigree diagrams to various formats:
 * - SVG (vector graphics)
 * - PNG (raster graphics)
 * - PED (GATK format)
 */

import { toPng, toSvg } from 'html-to-image';
import type { Pedigree } from '@/core/model/types';
import { PedWriter } from '@/core/parser/PedWriter';

export interface ExportOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string;
  padding?: number;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  filename: 'pedigree',
  scale: 2,
  backgroundColor: '#ffffff',
  padding: 20,
};

export class ExportService {
  private pedWriter: PedWriter;

  constructor() {
    this.pedWriter = new PedWriter();
  }

  /**
   * Export SVG element as SVG file
   */
  async exportSvg(
    svgElement: SVGSVGElement,
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename, backgroundColor, padding } = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // Get bounding box
      const bbox = svgElement.getBBox();

      // Update viewBox to include padding
      const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
      clonedSvg.setAttribute('viewBox', viewBox);
      clonedSvg.setAttribute('width', String(bbox.width + padding * 2));
      clonedSvg.setAttribute('height', String(bbox.height + padding * 2));

      // Add background
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', String(bbox.x - padding));
      bgRect.setAttribute('y', String(bbox.y - padding));
      bgRect.setAttribute('width', String(bbox.width + padding * 2));
      bgRect.setAttribute('height', String(bbox.height + padding * 2));
      bgRect.setAttribute('fill', backgroundColor);
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

      // Inline styles for standalone SVG
      this.inlineStyles(clonedSvg);

      // Serialize to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);

      // Add XML declaration
      svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

      // Create and download blob
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      this.downloadBlob(blob, `${filename}.svg`);
    } catch (error) {
      console.error('Failed to export SVG:', error);
      throw new Error('Failed to export SVG');
    }
  }

  /**
   * Export SVG element as PNG file
   */
  async exportPng(
    svgElement: SVGSVGElement,
    options: ExportOptions = {}
  ): Promise<void> {
    const { filename, scale, backgroundColor } = { ...DEFAULT_OPTIONS, ...options };

    try {
      const dataUrl = await toPng(svgElement as unknown as HTMLElement, {
        pixelRatio: scale,
        backgroundColor,
        cacheBust: true,
      });

      // Convert data URL to blob and download
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      this.downloadBlob(blob, `${filename}.png`);
    } catch (error) {
      console.error('Failed to export PNG:', error);
      throw new Error('Failed to export PNG');
    }
  }

  /**
   * Export pedigree as PED file
   */
  exportPed(pedigree: Pedigree, options: ExportOptions = {}): void {
    const { filename } = { ...DEFAULT_OPTIONS, ...options };

    try {
      const pedContent = this.pedWriter.write(pedigree);
      const blob = new Blob([pedContent], { type: 'text/plain;charset=utf-8' });
      this.downloadBlob(blob, `${filename}.ped`);
    } catch (error) {
      console.error('Failed to export PED:', error);
      throw new Error('Failed to export PED file');
    }
  }

  /**
   * Download a blob as a file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Inline computed styles for standalone SVG
   */
  private inlineStyles(svg: SVGSVGElement): void {
    const elements = svg.querySelectorAll('*');

    elements.forEach((el) => {
      const element = el as SVGElement;
      const computed = window.getComputedStyle(element);

      // Only inline essential styles
      const essentialStyles = [
        'fill',
        'stroke',
        'stroke-width',
        'stroke-dasharray',
        'font-family',
        'font-size',
        'font-weight',
        'text-anchor',
        'dominant-baseline',
      ];

      essentialStyles.forEach((prop) => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== '0px') {
          element.style.setProperty(prop, value);
        }
      });
    });
  }
}

export const exportService = new ExportService();

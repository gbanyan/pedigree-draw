/**
 * useZoomPan Hook
 *
 * Adds zoom and pan functionality to the pedigree canvas
 */

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

export interface ZoomPanState {
  x: number;
  y: number;
  k: number;
}

interface UseZoomPanProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (state: ZoomPanState) => void;
}

export function useZoomPan({
  svgRef,
  minZoom = 0.1,
  maxZoom = 4,
  onZoomChange,
}: UseZoomPanProps) {
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransform = useRef(d3.zoomIdentity);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const mainGroup = svg.select<SVGGElement>('.pedigree-main');

    if (mainGroup.empty()) return;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on('zoom', (event) => {
        currentTransform.current = event.transform;
        mainGroup.attr('transform', event.transform.toString());
        onZoomChange?.({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        });
      });

    zoomBehavior.current = zoom;
    svg.call(zoom);

    // Double-click to reset zoom
    svg.on('dblclick.zoom', null);

    // Auto-center content on initial render
    const personsGroup = svg.select<SVGGElement>('.persons');
    if (!personsGroup.empty()) {
      const bounds = personsGroup.node()?.getBBox();
      if (bounds && bounds.width > 0) {
        const svgNode = svgRef.current;
        if (svgNode) {
          const svgWidth = svgNode.clientWidth;
          const svgHeight = svgNode.clientHeight;
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const translateX = svgWidth / 2 - centerX;
          const translateY = svgHeight / 2 - centerY;
          const initialTransform = d3.zoomIdentity.translate(translateX, translateY);
          svg.call(zoom.transform, initialTransform);
        }
      }
    }

    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, minZoom, maxZoom, onZoomChange]);

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);
    const personsGroup = svg.select<SVGGElement>('.persons');

    if (personsGroup.empty()) {
      // No content, just reset to identity
      svg.transition()
        .duration(300)
        .call(zoomBehavior.current.transform, d3.zoomIdentity);
      return;
    }

    // Reset to 100% zoom but centered on content
    const bounds = personsGroup.node()?.getBBox();
    if (!bounds) {
      svg.transition()
        .duration(300)
        .call(zoomBehavior.current.transform, d3.zoomIdentity);
      return;
    }

    const svgWidth = svgRef.current.clientWidth;
    const svgHeight = svgRef.current.clientHeight;

    // Center content at 100% zoom
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const translateX = svgWidth / 2 - centerX;
    const translateY = svgHeight / 2 - centerY;

    const transform = d3.zoomIdentity.translate(translateX, translateY);

    svg.transition()
      .duration(300)
      .call(zoomBehavior.current.transform, transform);
  }, [svgRef]);

  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(200)
      .call(zoomBehavior.current.scaleBy, 1.3);
  }, [svgRef]);

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(200)
      .call(zoomBehavior.current.scaleBy, 0.77);
  }, [svgRef]);

  const fitToContent = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);

    // Get bounding box from the actual content (persons group), not the whole main group
    // which includes a huge background rectangle
    const personsGroup = svg.select<SVGGElement>('.persons');
    const connectionsGroup = svg.select<SVGGElement>('.connections');

    if (personsGroup.empty()) return;

    // Calculate combined bounds from persons and connections
    const personsBounds = personsGroup.node()?.getBBox();
    const connectionsBounds = connectionsGroup.node()?.getBBox();

    if (!personsBounds) return;

    // Combine bounds using simple object
    let boundsX = personsBounds.x;
    let boundsY = personsBounds.y;
    let boundsWidth = personsBounds.width;
    let boundsHeight = personsBounds.height;

    if (connectionsBounds && connectionsBounds.width > 0) {
      const minX = Math.min(personsBounds.x, connectionsBounds.x);
      const minY = Math.min(personsBounds.y, connectionsBounds.y);
      const maxX = Math.max(personsBounds.x + personsBounds.width, connectionsBounds.x + connectionsBounds.width);
      const maxY = Math.max(personsBounds.y + personsBounds.height, connectionsBounds.y + connectionsBounds.height);
      boundsX = minX;
      boundsY = minY;
      boundsWidth = maxX - minX;
      boundsHeight = maxY - minY;
    }

    const svgWidth = svgRef.current.clientWidth;
    const svgHeight = svgRef.current.clientHeight;

    const padding = 50;
    const contentWidth = boundsWidth + padding * 2;
    const contentHeight = boundsHeight + padding * 2;

    // Calculate scale to fit
    const scale = Math.min(
      svgWidth / contentWidth,
      svgHeight / contentHeight,
      1 // Don't zoom in beyond 100%
    );

    // Calculate translation to center
    const translateX = (svgWidth - boundsWidth * scale) / 2 - boundsX * scale;
    const translateY = (svgHeight - boundsHeight * scale) / 2 - boundsY * scale;

    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    svg.transition()
      .duration(300)
      .call(zoomBehavior.current.transform, transform);
  }, [svgRef]);

  const setZoom = useCallback((scale: number) => {
    if (!svgRef.current || !zoomBehavior.current) return;

    const svg = d3.select(svgRef.current);
    const currentScale = currentTransform.current.k;
    const scaleFactor = scale / currentScale;

    svg.transition()
      .duration(200)
      .call(zoomBehavior.current.scaleBy, scaleFactor);
  }, [svgRef]);

  return {
    resetZoom,
    zoomIn,
    zoomOut,
    fitToContent,
    setZoom,
    currentTransform: currentTransform.current,
  };
}

/**
 * useDragBehavior Hook
 *
 * Enables drag functionality for person nodes in the pedigree
 */

import { useEffect, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import type { LayoutNode } from '@/core/model/types';

interface UseDragBehaviorProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  layoutNodes: Map<string, LayoutNode>;
  isEnabled: boolean;
  onDragStart?: (personId: string) => void;
  onDrag?: (personId: string, x: number, y: number) => void;
  onDragEnd?: (personId: string, x: number, y: number) => void;
  onClick?: (personId: string) => void;
}

export function useDragBehavior({
  svgRef,
  layoutNodes,
  isEnabled,
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
}: UseDragBehaviorProps) {
  const draggedNode = useRef<string | null>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDragged = useRef<boolean>(false);

  useEffect(() => {
    if (!svgRef.current || !isEnabled) return;

    const svg = d3.select(svgRef.current);
    const persons = svg.selectAll<SVGGElement, unknown>('.person');

    const drag = d3.drag<SVGGElement, unknown>()
      .clickDistance(4) // Distinguish click from drag - must move at least 4px to be a drag
      .on('start', function (event) {
        const personId = d3.select(this).attr('data-id');
        if (!personId) return;

        draggedNode.current = personId;
        hasDragged.current = false;

        // Get current position from the transform attribute
        const currentTransform = d3.select(this).attr('transform');
        const match = currentTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          startPos.current = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        d3.select(this).classed('dragging', true);
        onDragStart?.(personId);
      })
      .on('drag', function (event) {
        const personId = d3.select(this).attr('data-id');
        if (!personId) return;

        hasDragged.current = true;

        // Get the zoom transform to account for scale
        const transform = d3.zoomTransform(svg.node()!);

        // Calculate new position: start position + delta adjusted for zoom scale
        const newX = startPos.current.x + event.dx / transform.k;
        const newY = startPos.current.y + event.dy / transform.k;

        // Update start position for next drag event
        startPos.current = { x: newX, y: newY };

        // Update visual position
        d3.select(this).attr('transform', `translate(${newX}, ${newY})`);

        onDrag?.(personId, newX, newY);
      })
      .on('end', function (event) {
        const personId = d3.select(this).attr('data-id');
        if (!personId) return;

        d3.select(this).classed('dragging', false);

        // If we didn't actually drag, treat it as a click
        if (!hasDragged.current) {
          onClick?.(personId);
        } else {
          const finalX = startPos.current.x;
          const finalY = startPos.current.y;
          onDragEnd?.(personId, finalX, finalY);
        }

        draggedNode.current = null;
        hasDragged.current = false;
      });

    persons.call(drag);

    return () => {
      persons.on('.drag', null);
    };
  }, [svgRef, layoutNodes, isEnabled, onDragStart, onDrag, onDragEnd, onClick]);

  const enableDrag = useCallback(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll('.person')
      .style('cursor', 'grab');
  }, [svgRef]);

  const disableDrag = useCallback(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll('.person')
      .style('cursor', 'pointer');
  }, [svgRef]);

  return {
    enableDrag,
    disableDrag,
    isDragging: draggedNode.current !== null,
  };
}

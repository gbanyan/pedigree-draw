/**
 * PedigreeCanvas Component
 *
 * Main canvas for rendering and interacting with the pedigree diagram
 */

import { useCallback, useState } from 'react';
import { usePedigreeStore } from '@/store/pedigreeStore';
import { useD3Pedigree } from './hooks/useD3Pedigree';
import { useZoomPan } from './hooks/useZoomPan';
import { useDragBehavior } from './hooks/useDragBehavior';
import styles from './PedigreeCanvas.module.css';

export function PedigreeCanvas() {
  const {
    pedigree,
    layoutNodes,
    selectedPersonId,
    selectedRelationshipId,
    currentTool,
    selectPerson,
    selectRelationship,
    clearSelection,
    updatePersonPosition,
  } = usePedigreeStore();

  const [zoomLevel, setZoomLevel] = useState(1);

  const handlePersonClick = useCallback((personId: string) => {
    if (currentTool === 'select') {
      selectPerson(personId);
    }
  }, [currentTool, selectPerson]);

  const handlePersonDoubleClick = useCallback((personId: string) => {
    // Could open edit dialog
    selectPerson(personId);
  }, [selectPerson]);

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleRelationshipClick = useCallback((relationshipId: string) => {
    if (currentTool === 'select') {
      selectRelationship(relationshipId);
    }
  }, [currentTool, selectRelationship]);

  const { svgRef } = useD3Pedigree({
    pedigree,
    layoutNodes,
    selectedPersonId,
    selectedRelationshipId,
    onPersonClick: handlePersonClick,
    onPersonDoubleClick: handlePersonDoubleClick,
    onRelationshipClick: handleRelationshipClick,
    onBackgroundClick: handleBackgroundClick,
  });

  const { resetZoom, zoomIn, zoomOut, fitToContent } = useZoomPan({
    svgRef,
    onZoomChange: (state) => setZoomLevel(Math.round(state.k * 100) / 100),
  });

  const { isDragging } = useDragBehavior({
    svgRef,
    layoutNodes,
    isEnabled: currentTool === 'select',
    onDragEnd: (personId, x, y) => {
      updatePersonPosition(personId, x, y);
    },
    onClick: (personId) => {
      selectPerson(personId);
    },
  });

  return (
    <div className={styles.canvasContainer} data-tour="canvas">
      <div className={styles.zoomControls}>
        <button onClick={zoomIn} title="Zoom In">+</button>
        <span className={styles.zoomLevel}>{Math.round(zoomLevel * 100)}%</span>
        <button onClick={zoomOut} title="Zoom Out">-</button>
        <button onClick={resetZoom} title="Reset Zoom">Reset</button>
        <button onClick={fitToContent} title="Fit to Content">Fit</button>
      </div>

      <svg
        ref={svgRef}
        className={styles.canvas}
        width="100%"
        height="100%"
      />

      {!pedigree && (
        <div className={styles.emptyState}>
          <p>No pedigree loaded</p>
          <p>Import a PED file or create a new pedigree</p>
        </div>
      )}

      {pedigree && pedigree.persons.size === 0 && (
        <div className={styles.emptyState}>
          <p>Pedigree: {pedigree.familyId}</p>
          <p>Use the toolbar to add persons (Male/Female/Unknown)</p>
        </div>
      )}
    </div>
  );
}

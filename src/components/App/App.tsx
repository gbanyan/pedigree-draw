/**
 * App Component
 *
 * Main application layout
 */

import { useEffect } from 'react';
import { PedigreeCanvas } from '../PedigreeCanvas/PedigreeCanvas';
import { Toolbar } from '../Toolbar/Toolbar';
import { PropertyPanel } from '../PropertyPanel/PropertyPanel';
import { RelationshipPanel } from '../RelationshipPanel/RelationshipPanel';
import { FilePanel } from '../FilePanel/FilePanel';
import { usePedigreeStore, useTemporalStore } from '@/store/pedigreeStore';
import styles from './App.module.css';

export function App() {
  const {
    clearSelection,
    selectedPersonId,
    selectedRelationshipId,
    deletePerson,
    deleteRelationship,
  } = usePedigreeStore();
  const temporal = useTemporalStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        temporal.getState().undo();
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        temporal.getState().redo();
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }

      // Delete or Backspace: Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedPersonId) {
          deletePerson(selectedPersonId);
        } else if (selectedRelationshipId) {
          deleteRelationship(selectedRelationshipId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, selectedPersonId, selectedRelationshipId, deletePerson, deleteRelationship, temporal]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pedigree Draw</h1>
        <span className={styles.subtitle}>Professional Pedigree Chart Editor</span>
      </header>

      <Toolbar />

      <main className={styles.main}>
        <FilePanel />
        <div className={styles.canvasArea}>
          <PedigreeCanvas />
        </div>
        {selectedRelationshipId ? <RelationshipPanel /> : <PropertyPanel />}
      </main>

      <footer className={styles.footer}>
        <span>Pedigree Draw - For genetic counselors and bioinformatics professionals</span>
        <span>NSGC Standard Symbols</span>
      </footer>
    </div>
  );
}

/**
 * App Component
 *
 * Main application layout
 */

import { useEffect, useState } from 'react';
import { PedigreeCanvas } from '../PedigreeCanvas/PedigreeCanvas';
import { Toolbar } from '../Toolbar/Toolbar';
import { PropertyPanel } from '../PropertyPanel/PropertyPanel';
import { RelationshipPanel } from '../RelationshipPanel/RelationshipPanel';
import { FilePanel } from '../FilePanel/FilePanel';
import { WelcomeModal } from '../WelcomeModal/WelcomeModal';
import { TourPromptModal } from '../TourPromptModal/TourPromptModal';
import { useGuidedTour } from '../GuidedTour/useGuidedTour';
import { usePedigreeStore, useTemporalStore } from '@/store/pedigreeStore';
import styles from './App.module.css';

const WELCOME_DISMISSED_KEY = 'pedigree-draw-welcome-dismissed';
const TOUR_COMPLETED_KEY = 'pedigree-draw-tour-completed';

export function App() {
  const {
    clearSelection,
    selectedPersonId,
    selectedRelationshipId,
    deletePerson,
    deleteRelationship,
  } = usePedigreeStore();
  const temporal = useTemporalStore();

  // Guided tour hook
  const { startTour } = useGuidedTour();

  // Welcome modal state - check localStorage on init
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem(WELCOME_DISMISSED_KEY) !== 'true';
  });

  // Tour prompt modal state - show after welcome if tour not completed
  const [showTourPrompt, setShowTourPrompt] = useState(false);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    // Show tour prompt if tour hasn't been completed yet
    if (localStorage.getItem(TOUR_COMPLETED_KEY) !== 'true') {
      setShowTourPrompt(true);
    }
  };

  const handleStartTour = () => {
    setShowTourPrompt(false);
    // Small delay to let modal close before tour starts
    setTimeout(() => {
      startTour();
    }, 100);
  };

  const handleSkipTour = () => {
    setShowTourPrompt(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  };

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

      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
      {showTourPrompt && (
        <TourPromptModal onStartTour={handleStartTour} onSkip={handleSkipTour} />
      )}
    </div>
  );
}

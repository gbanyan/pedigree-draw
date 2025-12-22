/**
 * Toolbar Component
 *
 * Main toolbar with tools for editing the pedigree
 */

import { useState } from 'react';
import { usePedigreeStore, useTemporalStore } from '@/store/pedigreeStore';
import { createPerson, createRelationship, Sex, RelationshipType } from '@/core/model/types';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const {
    pedigree,
    currentTool,
    selectedPersonId,
    setCurrentTool,
    addPerson,
    addRelationship,
    updatePerson,
    deletePerson,
    createNewPedigree,
    recalculateLayout,
  } = usePedigreeStore();

  const [showRelationshipMenu, setShowRelationshipMenu] = useState(false);

  const temporal = useTemporalStore();
  const { undo, redo, pastStates, futureStates } = temporal.getState();

  const handleAddPerson = (sex: Sex) => {
    let currentPedigree = pedigree;

    if (!currentPedigree) {
      createNewPedigree('FAM001');
      // Get the latest state after creating
      currentPedigree = usePedigreeStore.getState().pedigree;
    }

    if (!currentPedigree) return; // Safety check

    const id = `P${Date.now().toString(36)}`;
    const person = createPerson(id, currentPedigree.familyId, sex);
    person.metadata.label = id;

    // Set initial position
    const existingNodes = currentPedigree.persons.size;
    person.x = 100 + (existingNodes % 5) * 100;
    person.y = 100 + Math.floor(existingNodes / 5) * 150;

    addPerson(person);
  };

  const handleDelete = () => {
    if (selectedPersonId) {
      deletePerson(selectedPersonId);
    }
  };

  const handleAddSpouse = () => {
    if (!pedigree || !selectedPersonId) return;

    const selectedPerson = pedigree.persons.get(selectedPersonId);
    if (!selectedPerson) return;

    // Create a new person of opposite sex
    const newSex = selectedPerson.sex === Sex.Male ? Sex.Female :
                   selectedPerson.sex === Sex.Female ? Sex.Male : Sex.Unknown;
    const id = `P${Date.now().toString(36)}`;
    const newPerson = createPerson(id, pedigree.familyId, newSex);
    newPerson.metadata.label = id;
    newPerson.x = (selectedPerson.x ?? 0) + 80;
    newPerson.y = selectedPerson.y ?? 100;

    addPerson(newPerson);

    // Create spouse relationship
    const relationship = createRelationship(selectedPersonId, id, RelationshipType.Spouse);
    addRelationship(relationship);
  };

  const handleAddChild = () => {
    if (!pedigree || !selectedPersonId) return;

    const selectedPerson = pedigree.persons.get(selectedPersonId);
    if (!selectedPerson) return;

    // Create a new child
    const id = `P${Date.now().toString(36)}`;
    const child = createPerson(id, pedigree.familyId, Sex.Unknown);
    child.metadata.label = id;
    child.x = selectedPerson.x ?? 0;
    child.y = (selectedPerson.y ?? 0) + 120;

    // Set parent based on selected person's sex
    if (selectedPerson.sex === Sex.Male) {
      child.fatherId = selectedPersonId;
    } else if (selectedPerson.sex === Sex.Female) {
      child.motherId = selectedPersonId;
    }

    addPerson(child);

    // Update selected person's children
    updatePerson(selectedPersonId, {
      childrenIds: [...selectedPerson.childrenIds, id],
    });

    recalculateLayout();
  };

  const handleAddParents = () => {
    if (!pedigree || !selectedPersonId) return;

    const selectedPerson = pedigree.persons.get(selectedPersonId);
    if (!selectedPerson) return;

    // Create father
    const fatherId = `P${Date.now().toString(36)}F`;
    const father = createPerson(fatherId, pedigree.familyId, Sex.Male);
    father.metadata.label = fatherId;
    father.x = (selectedPerson.x ?? 0) - 40;
    father.y = (selectedPerson.y ?? 0) - 120;
    father.childrenIds = [selectedPersonId];

    // Create mother
    const motherId = `P${Date.now().toString(36)}M`;
    const mother = createPerson(motherId, pedigree.familyId, Sex.Female);
    mother.metadata.label = motherId;
    mother.x = (selectedPerson.x ?? 0) + 40;
    mother.y = (selectedPerson.y ?? 0) - 120;
    mother.childrenIds = [selectedPersonId];

    addPerson(father);
    addPerson(mother);

    // Update child's parent references
    updatePerson(selectedPersonId, {
      fatherId,
      motherId,
    });

    // Create spouse relationship between parents
    const relationship = createRelationship(fatherId, motherId, RelationshipType.Spouse);
    relationship.childrenIds = [selectedPersonId];
    addRelationship(relationship);

    recalculateLayout();
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolGroup}>
        <button
          className={`${styles.toolButton} ${currentTool === 'select' ? styles.active : ''}`}
          onClick={() => setCurrentTool('select')}
          title="Select (V)"
        >
          <SelectIcon />
          Select
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.toolGroup} data-tour="person-buttons">
        <button
          className={styles.toolButton}
          onClick={() => handleAddPerson(Sex.Male)}
          title="Add Male"
        >
          <MaleIcon />
          Male
        </button>
        <button
          className={styles.toolButton}
          onClick={() => handleAddPerson(Sex.Female)}
          title="Add Female"
        >
          <FemaleIcon />
          Female
        </button>
        <button
          className={styles.toolButton}
          onClick={() => handleAddPerson(Sex.Unknown)}
          title="Add Unknown"
        >
          <UnknownIcon />
          Unknown
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.toolGroup} data-tour="relationship-buttons">
        <button
          className={styles.toolButton}
          onClick={handleAddSpouse}
          disabled={!selectedPersonId}
          title="Add Spouse"
        >
          <SpouseIcon />
          Spouse
        </button>
        <button
          className={styles.toolButton}
          onClick={handleAddChild}
          disabled={!selectedPersonId}
          title="Add Child"
        >
          <ChildIcon />
          Child
        </button>
        <button
          className={styles.toolButton}
          onClick={handleAddParents}
          disabled={!selectedPersonId}
          title="Add Parents"
        >
          <ParentsIcon />
          Parents
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.toolGroup}>
        <button
          className={styles.toolButton}
          onClick={handleDelete}
          disabled={!selectedPersonId}
          title="Delete Selected (Del)"
        >
          <DeleteIcon />
          Delete
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.toolGroup}>
        <button
          className={styles.toolButton}
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
          Undo
        </button>
        <button
          className={styles.toolButton}
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          title="Redo (Ctrl+Y)"
        >
          <RedoIcon />
          Redo
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.toolGroup}>
        <button
          className={styles.toolButton}
          onClick={() => recalculateLayout()}
          disabled={!pedigree || pedigree.persons.size === 0}
          title="Auto Align - Reset all positions"
        >
          <AutoAlignIcon />
          Auto Align
        </button>
      </div>
    </div>
  );
}

// Simple SVG icons
function SelectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2l10 10-4 1 3 7-2 1-3-7-4 4V2z" />
    </svg>
  );
}

function MaleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" />
    </svg>
  );
}

function FemaleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function UnknownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l10 10-10 10L2 12z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
    </svg>
  );
}

function SpouseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="8" width="8" height="8" />
      <circle cx="18" cy="12" r="4" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function ChildIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="2" width="8" height="8" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <path d="M12 14 L12 18 M8 18 L16 18" />
      <circle cx="12" cy="20" r="2" />
    </svg>
  );
}

function ParentsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="6" height="6" />
      <circle cx="19" cy="5" r="3" />
      <line x1="8" y1="5" x2="16" y2="5" />
      <line x1="12" y1="5" x2="12" y2="10" />
      <circle cx="12" cy="18" r="4" />
      <line x1="12" y1="10" x2="12" y2="14" />
    </svg>
  );
}

function AutoAlignIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {/* Grid lines */}
      <line x1="4" y1="4" x2="4" y2="20" strokeDasharray="2,2" />
      <line x1="12" y1="4" x2="12" y2="20" strokeDasharray="2,2" />
      <line x1="20" y1="4" x2="20" y2="20" strokeDasharray="2,2" />
      <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="2,2" />
      {/* Alignment arrows */}
      <path d="M7 8 L12 4 L17 8" fill="none" />
      <path d="M7 16 L12 20 L17 16" fill="none" />
    </svg>
  );
}

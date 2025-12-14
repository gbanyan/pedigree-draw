/**
 * RelationshipTool Component
 *
 * Tool for creating relationships between persons
 */

import { useState, useCallback } from 'react';
import { usePedigreeStore } from '@/store/pedigreeStore';
import { createRelationship, RelationshipType } from '@/core/model/types';
import styles from '../Toolbar.module.css';

interface RelationshipToolProps {
  onClose?: () => void;
}

export function RelationshipTool({ onClose }: RelationshipToolProps) {
  const {
    pedigree,
    selectedPersonId,
    addRelationship,
    updatePerson,
  } = usePedigreeStore();

  const [relationshipType, setRelationshipType] = useState<'spouse' | 'parent' | 'child'>('spouse');
  const [targetPersonId, setTargetPersonId] = useState<string>('');

  const persons = pedigree ? Array.from(pedigree.persons.values()) : [];
  const selectedPerson = selectedPersonId ? pedigree?.persons.get(selectedPersonId) : null;

  const availableTargets = persons.filter(p => p.id !== selectedPersonId);

  const handleCreateRelationship = useCallback(() => {
    if (!selectedPersonId || !targetPersonId || !pedigree) return;

    const selectedPerson = pedigree.persons.get(selectedPersonId);
    const targetPerson = pedigree.persons.get(targetPersonId);

    if (!selectedPerson || !targetPerson) return;

    switch (relationshipType) {
      case 'spouse': {
        const relationship = createRelationship(
          selectedPersonId,
          targetPersonId,
          RelationshipType.Spouse
        );
        addRelationship(relationship);
        break;
      }
      case 'parent': {
        // Make target person a parent of selected person
        if (targetPerson.sex === 'male') {
          updatePerson(selectedPersonId, { fatherId: targetPersonId });
        } else if (targetPerson.sex === 'female') {
          updatePerson(selectedPersonId, { motherId: targetPersonId });
        }
        // Add selected person as child of target
        updatePerson(targetPersonId, {
          childrenIds: [...targetPerson.childrenIds, selectedPersonId],
        });
        break;
      }
      case 'child': {
        // Make target person a child of selected person
        if (selectedPerson.sex === 'male') {
          updatePerson(targetPersonId, { fatherId: selectedPersonId });
        } else if (selectedPerson.sex === 'female') {
          updatePerson(targetPersonId, { motherId: selectedPersonId });
        }
        // Add target person as child of selected
        updatePerson(selectedPersonId, {
          childrenIds: [...selectedPerson.childrenIds, targetPersonId],
        });
        break;
      }
    }

    setTargetPersonId('');
    onClose?.();
  }, [selectedPersonId, targetPersonId, relationshipType, pedigree, addRelationship, updatePerson, onClose]);

  if (!selectedPerson) {
    return (
      <div className={styles.relationshipTool}>
        <p>Select a person first to create relationships</p>
      </div>
    );
  }

  return (
    <div className={styles.relationshipTool}>
      <div className={styles.relationshipRow}>
        <label>Type:</label>
        <select
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value as 'spouse' | 'parent' | 'child')}
        >
          <option value="spouse">Spouse</option>
          <option value="parent">Parent of {selectedPerson.id}</option>
          <option value="child">Child of {selectedPerson.id}</option>
        </select>
      </div>

      <div className={styles.relationshipRow}>
        <label>Target:</label>
        <select
          value={targetPersonId}
          onChange={(e) => setTargetPersonId(e.target.value)}
        >
          <option value="">-- Select --</option>
          {availableTargets.map(person => (
            <option key={person.id} value={person.id}>
              {person.metadata.label || person.id} ({person.sex})
            </option>
          ))}
        </select>
      </div>

      <button
        className={styles.button}
        onClick={handleCreateRelationship}
        disabled={!targetPersonId}
      >
        Create Relationship
      </button>
    </div>
  );
}

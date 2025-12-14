/**
 * RelationshipPanel Component
 *
 * Panel for editing properties of the selected relationship
 */

import { usePedigreeStore } from '@/store/pedigreeStore';
import {
  RelationshipType,
  PartnershipStatus,
  ChildlessReason,
} from '@/core/model/types';
import styles from './RelationshipPanel.module.css';

export function RelationshipPanel() {
  const {
    pedigree,
    selectedRelationshipId,
    updateRelationship,
    deleteRelationship,
    clearSelection,
  } = usePedigreeStore();

  const selectedRelationship = selectedRelationshipId && pedigree
    ? pedigree.relationships.get(selectedRelationshipId)
    : null;

  if (!selectedRelationship) {
    return null;
  }

  const person1 = pedigree?.persons.get(selectedRelationship.person1Id);
  const person2 = pedigree?.persons.get(selectedRelationship.person2Id);

  const handleTypeChange = (isConsanguineous: boolean) => {
    updateRelationship(selectedRelationship.id, {
      type: isConsanguineous ? RelationshipType.Consanguineous : RelationshipType.Spouse,
    });
  };

  const handlePartnershipStatusChange = (status: PartnershipStatus) => {
    updateRelationship(selectedRelationship.id, { partnershipStatus: status });
  };

  const handleConsanguinityDegreeChange = (degree: number) => {
    updateRelationship(selectedRelationship.id, { consanguinityDegree: degree });
  };

  const handleChildlessReasonChange = (reason: ChildlessReason) => {
    updateRelationship(selectedRelationship.id, { childlessReason: reason });
  };

  const handleDelete = () => {
    deleteRelationship(selectedRelationship.id);
    clearSelection();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Relationship</span>
        <button
          className={styles.closeButton}
          onClick={clearSelection}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Parties Section */}
      <div className={styles.partiesSection}>
        <div className={styles.party}>
          {person1?.metadata.label || person1?.id || 'Unknown'}
        </div>
        <div className={styles.connector}>⟷</div>
        <div className={styles.party}>
          {person2?.metadata.label || person2?.id || 'Unknown'}
        </div>
      </div>

      {/* Partnership Status Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Partnership Status</div>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.optionButton} ${
              (!selectedRelationship.partnershipStatus ||
               selectedRelationship.partnershipStatus === PartnershipStatus.Married)
                ? styles.active : ''
            }`}
            onClick={() => handlePartnershipStatusChange(PartnershipStatus.Married)}
          >
            Married
          </button>
          <button
            className={`${styles.optionButton} ${
              selectedRelationship.partnershipStatus === PartnershipStatus.Unmarried
                ? styles.active : ''
            }`}
            onClick={() => handlePartnershipStatusChange(PartnershipStatus.Unmarried)}
          >
            Unmarried
          </button>
          <button
            className={`${styles.optionButton} ${
              selectedRelationship.partnershipStatus === PartnershipStatus.Separated
                ? styles.active : ''
            }`}
            onClick={() => handlePartnershipStatusChange(PartnershipStatus.Separated)}
          >
            Separated
          </button>
          <button
            className={`${styles.optionButton} ${
              selectedRelationship.partnershipStatus === PartnershipStatus.Divorced
                ? styles.active : ''
            }`}
            onClick={() => handlePartnershipStatusChange(PartnershipStatus.Divorced)}
          >
            Divorced
          </button>
        </div>
      </div>

      {/* Consanguinity Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Consanguinity</div>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={selectedRelationship.type === RelationshipType.Consanguineous}
            onChange={(e) => handleTypeChange(e.target.checked)}
          />
          Consanguineous relationship (related by blood)
        </label>
        {selectedRelationship.type === RelationshipType.Consanguineous && (
          <div className={styles.degreeSelector}>
            <label>Degree:</label>
            <select
              value={selectedRelationship.consanguinityDegree || 1}
              onChange={(e) => handleConsanguinityDegreeChange(Number(e.target.value))}
            >
              <option value={1}>First cousins</option>
              <option value={2}>Second cousins</option>
              <option value={3}>Third cousins</option>
              <option value={4}>Fourth cousins or more distant</option>
            </select>
          </div>
        )}
      </div>

      {/* Childlessness Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Children Status</div>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.optionButton} ${
              (!selectedRelationship.childlessReason ||
               selectedRelationship.childlessReason === ChildlessReason.None)
                ? styles.active : ''
            }`}
            onClick={() => handleChildlessReasonChange(ChildlessReason.None)}
          >
            Has/May have children
          </button>
          <button
            className={`${styles.optionButton} ${
              selectedRelationship.childlessReason === ChildlessReason.ByChoice
                ? styles.active : ''
            }`}
            onClick={() => handleChildlessReasonChange(ChildlessReason.ByChoice)}
          >
            No children (by choice)
          </button>
          <button
            className={`${styles.optionButton} ${
              selectedRelationship.childlessReason === ChildlessReason.Infertility
                ? styles.active : ''
            }`}
            onClick={() => handleChildlessReasonChange(ChildlessReason.Infertility)}
          >
            Infertility
          </button>
        </div>
      </div>

      {/* Children List */}
      {selectedRelationship.childrenIds.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Children ({selectedRelationship.childrenIds.length})
          </div>
          <div className={styles.childrenList}>
            {selectedRelationship.childrenIds.map(childId => {
              const child = pedigree?.persons.get(childId);
              return (
                <div key={childId} className={styles.childItem}>
                  {child?.metadata.label || childId}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Button */}
      <div className={styles.section}>
        <button
          className={styles.deleteButton}
          onClick={handleDelete}
        >
          Delete Relationship
        </button>
      </div>
    </div>
  );
}

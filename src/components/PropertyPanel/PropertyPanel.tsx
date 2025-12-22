/**
 * PropertyPanel Component
 *
 * Panel for editing properties of the selected person or relationship
 */

import { usePedigreeStore } from '@/store/pedigreeStore';
import { Sex, Phenotype } from '@/core/model/types';
import styles from './PropertyPanel.module.css';

export function PropertyPanel() {
  const {
    pedigree,
    selectedPersonId,
    updatePerson,
  } = usePedigreeStore();

  const selectedPerson = selectedPersonId && pedigree
    ? pedigree.persons.get(selectedPersonId)
    : null;

  if (!selectedPerson) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>Properties</div>
        <div className={styles.empty}>
          Select a person to edit properties
        </div>
      </div>
    );
  }

  const handleSexChange = (sex: Sex) => {
    updatePerson(selectedPerson.id, { sex });
  };

  const handlePhenotypeChange = (phenotype: Phenotype) => {
    updatePerson(selectedPerson.id, { phenotypes: [phenotype] });
  };

  const handleStatusChange = (key: keyof typeof selectedPerson.status, value: boolean) => {
    updatePerson(selectedPerson.id, {
      status: { ...selectedPerson.status, [key]: value },
    });
  };

  const handleLabelChange = (label: string) => {
    updatePerson(selectedPerson.id, {
      metadata: { ...selectedPerson.metadata, label },
    });
  };

  const handleLabel2Change = (label2: string) => {
    updatePerson(selectedPerson.id, {
      metadata: { ...selectedPerson.metadata, label2 },
    });
  };

  const handleMetadataChange = (key: keyof typeof selectedPerson.metadata, value: unknown) => {
    updatePerson(selectedPerson.id, {
      metadata: { ...selectedPerson.metadata, [key]: value },
    });
  };

  return (
    <div className={styles.panel} data-tour="property-panel">
      <div className={styles.header}>
        Properties
        <span className={styles.personId}>{selectedPerson.id}</span>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Label</div>
        <input
          type="text"
          className={styles.input}
          value={selectedPerson.metadata.label ?? ''}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Enter label..."
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Label Line 2</div>
        <input
          type="text"
          className={styles.input}
          value={selectedPerson.metadata.label2 ?? ''}
          onChange={(e) => handleLabel2Change(e.target.value)}
          placeholder="Second line text..."
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Birth/Death/Age</div>
        <div className={styles.inlineGroup}>
          <label className={styles.inlineLabel}>
            <input
              type="checkbox"
              checked={selectedPerson.metadata.showBirthYear ?? false}
              onChange={(e) => handleMetadataChange('showBirthYear', e.target.checked)}
            />
            Birth
          </label>
          <input
            type="number"
            className={styles.smallInput}
            value={selectedPerson.metadata.birthYear ?? ''}
            onChange={(e) => handleMetadataChange('birthYear', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Year"
          />
        </div>
        <div className={styles.inlineGroup}>
          <label className={styles.inlineLabel}>
            <input
              type="checkbox"
              checked={selectedPerson.metadata.showDeathYear ?? false}
              onChange={(e) => handleMetadataChange('showDeathYear', e.target.checked)}
            />
            Death
          </label>
          <input
            type="number"
            className={styles.smallInput}
            value={selectedPerson.metadata.deathYear ?? ''}
            onChange={(e) => handleMetadataChange('deathYear', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Year"
          />
        </div>
        <div className={styles.inlineGroup}>
          <label className={styles.inlineLabel}>
            <input
              type="checkbox"
              checked={selectedPerson.metadata.showAge ?? false}
              onChange={(e) => handleMetadataChange('showAge', e.target.checked)}
            />
            Age
          </label>
          <input
            type="number"
            className={styles.smallInput}
            value={selectedPerson.metadata.age ?? ''}
            onChange={(e) => handleMetadataChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Age"
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Sex</div>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.optionButton} ${selectedPerson.sex === Sex.Male ? styles.active : ''}`}
            onClick={() => handleSexChange(Sex.Male)}
          >
            Male
          </button>
          <button
            className={`${styles.optionButton} ${selectedPerson.sex === Sex.Female ? styles.active : ''}`}
            onClick={() => handleSexChange(Sex.Female)}
          >
            Female
          </button>
          <button
            className={`${styles.optionButton} ${selectedPerson.sex === Sex.Unknown ? styles.active : ''}`}
            onClick={() => handleSexChange(Sex.Unknown)}
          >
            Unknown
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Phenotype</div>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.optionButton} ${selectedPerson.phenotypes[0] === Phenotype.Unaffected ? styles.active : ''}`}
            onClick={() => handlePhenotypeChange(Phenotype.Unaffected)}
          >
            Unaffected
          </button>
          <button
            className={`${styles.optionButton} ${selectedPerson.phenotypes[0] === Phenotype.Affected ? styles.active : ''}`}
            onClick={() => handlePhenotypeChange(Phenotype.Affected)}
          >
            Affected
          </button>
          <button
            className={`${styles.optionButton} ${selectedPerson.phenotypes[0] === Phenotype.Carrier ? styles.active : ''}`}
            onClick={() => handlePhenotypeChange(Phenotype.Carrier)}
          >
            Carrier
          </button>
          <button
            className={`${styles.optionButton} ${selectedPerson.phenotypes[0] === Phenotype.Unknown ? styles.active : ''}`}
            onClick={() => handlePhenotypeChange(Phenotype.Unknown)}
          >
            Unknown
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Status</div>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedPerson.status.isDeceased}
              onChange={(e) => handleStatusChange('isDeceased', e.target.checked)}
            />
            Deceased
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedPerson.status.isProband}
              onChange={(e) => handleStatusChange('isProband', e.target.checked)}
            />
            Proband
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedPerson.status.isAdopted}
              onChange={(e) => handleStatusChange('isAdopted', e.target.checked)}
            />
            Adopted
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedPerson.status.isMiscarriage}
              onChange={(e) => handleStatusChange('isMiscarriage', e.target.checked)}
            />
            Miscarriage
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedPerson.status.isStillbirth}
              onChange={(e) => handleStatusChange('isStillbirth', e.target.checked)}
            />
            Stillbirth
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Relationships</div>
        <div className={styles.infoText}>
          {selectedPerson.fatherId && <div>Father: {selectedPerson.fatherId}</div>}
          {selectedPerson.motherId && <div>Mother: {selectedPerson.motherId}</div>}
          {selectedPerson.spouseIds.length > 0 && (
            <div>Spouse(s): {selectedPerson.spouseIds.join(', ')}</div>
          )}
          {selectedPerson.childrenIds.length > 0 && (
            <div>Children: {selectedPerson.childrenIds.join(', ')}</div>
          )}
          {!selectedPerson.fatherId && !selectedPerson.motherId &&
           selectedPerson.spouseIds.length === 0 && selectedPerson.childrenIds.length === 0 && (
            <div className={styles.noRelations}>No relationships defined</div>
          )}
        </div>
      </div>
    </div>
  );
}

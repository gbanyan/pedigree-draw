/**
 * FilePanel Component
 *
 * Handles file import and export operations
 */

import { useRef, useCallback, useState } from 'react';
import { usePedigreeStore } from '@/store/pedigreeStore';
import { PedParser } from '@/core/parser/PedParser';
import { exportService } from '@/services/exportService';
import styles from './FilePanel.module.css';

export function FilePanel() {
  const {
    pedigree,
    loadPedigree,
    createNewPedigree,
    clearPedigree,
  } = usePedigreeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setImportError(null);

    try {
      const content = await file.text();
      const parser = new PedParser();
      const { pedigree: newPedigree, result } = parser.parseToPedigree(content);

      if (result.errors.length > 0) {
        setImportError(`Parse errors: ${result.errors.map(e => e.message).join(', ')}`);
        return;
      }

      if (result.warnings.length > 0) {
        console.warn('Parse warnings:', result.warnings);
      }

      loadPedigree(newPedigree);
    } catch (error) {
      setImportError(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [loadPedigree]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleExportSvg = useCallback(async () => {
    const svg = document.querySelector('.pedigree-main')?.closest('svg') as SVGSVGElement;
    if (!svg) {
      alert('No pedigree to export');
      return;
    }

    try {
      await exportService.exportSvg(svg, { filename: pedigree?.familyId ?? 'pedigree' });
    } catch (error) {
      alert('Failed to export SVG');
    }
  }, [pedigree]);

  const handleExportPng = useCallback(async () => {
    const svg = document.querySelector('.pedigree-main')?.closest('svg') as SVGSVGElement;
    if (!svg) {
      alert('No pedigree to export');
      return;
    }

    try {
      await exportService.exportPng(svg, { filename: pedigree?.familyId ?? 'pedigree' });
    } catch (error) {
      alert('Failed to export PNG');
    }
  }, [pedigree]);

  const handleExportPed = useCallback(() => {
    if (!pedigree) {
      alert('No pedigree to export');
      return;
    }

    try {
      exportService.exportPed(pedigree, { filename: pedigree.familyId ?? 'pedigree' });
    } catch (error) {
      alert('Failed to export PED');
    }
  }, [pedigree]);

  const handleNewPedigree = useCallback(() => {
    const familyId = prompt('Enter Family ID:', 'FAM001');
    if (familyId) {
      createNewPedigree(familyId);
    }
  }, [createNewPedigree]);

  return (
    <div className={styles.panel} data-tour="file-panel">
      <div className={styles.header}>File Operations</div>

      <div className={styles.section}>
        <button className={styles.button} onClick={handleNewPedigree}>
          New Pedigree
        </button>
        <button className={styles.button} onClick={() => fileInputRef.current?.click()}>
          Import PED
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ped,.txt"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.dropZoneText}>
          Drag & Drop PED file here
        </div>
      </div>

      {importError && (
        <div className={styles.error}>{importError}</div>
      )}

      <div className={styles.divider} />

      <div className={styles.header}>Export</div>

      <div className={styles.section} data-tour="export-section">
        <button
          className={styles.button}
          onClick={handleExportSvg}
          disabled={!pedigree}
        >
          Export SVG
        </button>
        <button
          className={styles.button}
          onClick={handleExportPng}
          disabled={!pedigree}
        >
          Export PNG
        </button>
        <button
          className={styles.button}
          onClick={handleExportPed}
          disabled={!pedigree}
        >
          Export PED
        </button>
      </div>

      {pedigree && (
        <>
          <div className={styles.divider} />
          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span>Family ID:</span>
              <span>{pedigree.familyId}</span>
            </div>
            <div className={styles.infoItem}>
              <span>Persons:</span>
              <span>{pedigree.persons.size}</span>
            </div>
            <div className={styles.infoItem}>
              <span>Relationships:</span>
              <span>{pedigree.relationships.size}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

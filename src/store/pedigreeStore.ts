/**
 * Pedigree Store
 *
 * Global state management using Zustand with Zundo for undo/redo
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Pedigree, Person, Relationship, LayoutNode } from '@/core/model/types';
import {
  createPerson,
  createPedigree,
  createRelationship,
  Sex,
  Phenotype,
  RelationshipType,
} from '@/core/model/types';
import { PedigreeLayout } from '@/core/layout/PedigreeLayout';

interface PedigreeState {
  // Data
  pedigree: Pedigree | null;
  layoutNodes: Map<string, LayoutNode>;

  // Selection
  selectedPersonId: string | null;
  selectedRelationshipId: string | null;

  // UI State
  isEditing: boolean;
  currentTool: 'select' | 'add-person' | 'add-relationship' | 'delete';

  // Actions - Pedigree
  loadPedigree: (pedigree: Pedigree) => void;
  clearPedigree: () => void;
  createNewPedigree: (familyId: string) => void;

  // Actions - Person
  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  updatePersonPosition: (id: string, x: number, y: number) => void;

  // Actions - Relationship
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

  // Actions - Selection
  selectPerson: (id: string | null) => void;
  selectRelationship: (id: string | null) => void;
  clearSelection: () => void;

  // Actions - UI
  setCurrentTool: (tool: PedigreeState['currentTool']) => void;
  setIsEditing: (isEditing: boolean) => void;

  // Actions - Layout
  recalculateLayout: () => void;

  // Helpers
  getSelectedPerson: () => Person | null;
  getSelectedRelationship: () => Relationship | null;
}

const layout = new PedigreeLayout();

export const usePedigreeStore = create<PedigreeState>()(
  temporal(
    (set, get) => ({
      // Initial state
      pedigree: null,
      layoutNodes: new Map(),
      selectedPersonId: null,
      selectedRelationshipId: null,
      isEditing: false,
      currentTool: 'select',

      // Pedigree actions
      loadPedigree: (pedigree) => {
        const layoutNodes = layout.layout(pedigree);
        set({ pedigree, layoutNodes });
      },

      clearPedigree: () => {
        set({
          pedigree: null,
          layoutNodes: new Map(),
          selectedPersonId: null,
          selectedRelationshipId: null,
        });
      },

      createNewPedigree: (familyId) => {
        const pedigree = createPedigree(familyId);
        set({ pedigree, layoutNodes: new Map() });
      },

      // Person actions
      addPerson: (person) => {
        set((state) => {
          if (!state.pedigree) return state;

          const newPersons = new Map(state.pedigree.persons);
          newPersons.set(person.id, person);

          const newPedigree = {
            ...state.pedigree,
            persons: newPersons,
            metadata: {
              ...state.pedigree.metadata,
              modifiedAt: new Date(),
            },
          };

          const layoutNodes = layout.layout(newPedigree);
          return { pedigree: newPedigree, layoutNodes };
        });
      },

      updatePerson: (id, updates) => {
        set((state) => {
          if (!state.pedigree) return state;

          const person = state.pedigree.persons.get(id);
          if (!person) return state;

          const newPersons = new Map(state.pedigree.persons);
          newPersons.set(id, { ...person, ...updates });

          const newPedigree = {
            ...state.pedigree,
            persons: newPersons,
            metadata: {
              ...state.pedigree.metadata,
              modifiedAt: new Date(),
            },
          };

          return { pedigree: newPedigree };
        });
      },

      deletePerson: (id) => {
        set((state) => {
          if (!state.pedigree) return state;

          const newPersons = new Map(state.pedigree.persons);
          const person = newPersons.get(id);
          if (!person) return state;

          // Remove from other persons' references
          for (const [, p] of newPersons) {
            if (p.fatherId === id) p.fatherId = null;
            if (p.motherId === id) p.motherId = null;
            p.spouseIds = p.spouseIds.filter((sid) => sid !== id);
            p.childrenIds = p.childrenIds.filter((cid) => cid !== id);
          }

          newPersons.delete(id);

          // Remove related relationships
          const newRelationships = new Map(state.pedigree.relationships);
          for (const [relId, rel] of newRelationships) {
            if (rel.person1Id === id || rel.person2Id === id) {
              newRelationships.delete(relId);
            }
          }

          const newPedigree = {
            ...state.pedigree,
            persons: newPersons,
            relationships: newRelationships,
            metadata: {
              ...state.pedigree.metadata,
              modifiedAt: new Date(),
            },
          };

          const layoutNodes = layout.layout(newPedigree);
          return {
            pedigree: newPedigree,
            layoutNodes,
            selectedPersonId: state.selectedPersonId === id ? null : state.selectedPersonId,
          };
        });
      },

      updatePersonPosition: (id, x, y) => {
        set((state) => {
          if (!state.pedigree) return state;

          const person = state.pedigree.persons.get(id);
          if (!person) return state;

          const newPersons = new Map(state.pedigree.persons);
          newPersons.set(id, { ...person, x, y });

          const newLayoutNodes = new Map(state.layoutNodes);
          const node = newLayoutNodes.get(id);
          if (node) {
            newLayoutNodes.set(id, { ...node, x, y });
          }

          return {
            pedigree: {
              ...state.pedigree,
              persons: newPersons,
            },
            layoutNodes: newLayoutNodes,
          };
        });
      },

      // Relationship actions
      addRelationship: (relationship) => {
        set((state) => {
          if (!state.pedigree) return state;

          const newRelationships = new Map(state.pedigree.relationships);
          newRelationships.set(relationship.id, relationship);

          // Update spouse references
          const newPersons = new Map(state.pedigree.persons);
          const person1 = newPersons.get(relationship.person1Id);
          const person2 = newPersons.get(relationship.person2Id);

          if (person1 && !person1.spouseIds.includes(relationship.person2Id)) {
            newPersons.set(person1.id, {
              ...person1,
              spouseIds: [...person1.spouseIds, relationship.person2Id],
            });
          }
          if (person2 && !person2.spouseIds.includes(relationship.person1Id)) {
            newPersons.set(person2.id, {
              ...person2,
              spouseIds: [...person2.spouseIds, relationship.person1Id],
            });
          }

          const newPedigree = {
            ...state.pedigree,
            persons: newPersons,
            relationships: newRelationships,
            metadata: {
              ...state.pedigree.metadata,
              modifiedAt: new Date(),
            },
          };

          const layoutNodes = layout.layout(newPedigree);
          return { pedigree: newPedigree, layoutNodes };
        });
      },

      updateRelationship: (id, updates) => {
        set((state) => {
          if (!state.pedigree) return state;

          const relationship = state.pedigree.relationships.get(id);
          if (!relationship) return state;

          const newRelationships = new Map(state.pedigree.relationships);
          newRelationships.set(id, { ...relationship, ...updates });

          return {
            pedigree: {
              ...state.pedigree,
              relationships: newRelationships,
              metadata: {
                ...state.pedigree.metadata,
                modifiedAt: new Date(),
              },
            },
          };
        });
      },

      deleteRelationship: (id) => {
        set((state) => {
          if (!state.pedigree) return state;

          const relationship = state.pedigree.relationships.get(id);
          if (!relationship) return state;

          const newRelationships = new Map(state.pedigree.relationships);
          newRelationships.delete(id);

          // Remove spouse references
          const newPersons = new Map(state.pedigree.persons);
          const person1 = newPersons.get(relationship.person1Id);
          const person2 = newPersons.get(relationship.person2Id);

          if (person1) {
            newPersons.set(person1.id, {
              ...person1,
              spouseIds: person1.spouseIds.filter((sid) => sid !== relationship.person2Id),
            });
          }
          if (person2) {
            newPersons.set(person2.id, {
              ...person2,
              spouseIds: person2.spouseIds.filter((sid) => sid !== relationship.person1Id),
            });
          }

          const newPedigree = {
            ...state.pedigree,
            persons: newPersons,
            relationships: newRelationships,
            metadata: {
              ...state.pedigree.metadata,
              modifiedAt: new Date(),
            },
          };

          const layoutNodes = layout.layout(newPedigree);
          return {
            pedigree: newPedigree,
            layoutNodes,
            selectedRelationshipId: state.selectedRelationshipId === id ? null : state.selectedRelationshipId,
          };
        });
      },

      // Selection actions
      selectPerson: (id) => {
        set({ selectedPersonId: id, selectedRelationshipId: null });
      },

      selectRelationship: (id) => {
        set({ selectedRelationshipId: id, selectedPersonId: null });
      },

      clearSelection: () => {
        set({ selectedPersonId: null, selectedRelationshipId: null });
      },

      // UI actions
      setCurrentTool: (tool) => {
        set({ currentTool: tool });
      },

      setIsEditing: (isEditing) => {
        set({ isEditing });
      },

      // Layout actions
      recalculateLayout: () => {
        set((state) => {
          if (!state.pedigree) return state;
          const layoutNodes = layout.layout(state.pedigree);
          return { layoutNodes };
        });
      },

      // Helpers
      getSelectedPerson: () => {
        const state = get();
        if (!state.pedigree || !state.selectedPersonId) return null;
        return state.pedigree.persons.get(state.selectedPersonId) ?? null;
      },

      getSelectedRelationship: () => {
        const state = get();
        if (!state.pedigree || !state.selectedRelationshipId) return null;
        return state.pedigree.relationships.get(state.selectedRelationshipId) ?? null;
      },
    }),
    {
      // Zundo configuration
      partialize: (state) => ({
        pedigree: state.pedigree,
      }),
      limit: 50,
    }
  )
);

// Export temporal actions for undo/redo
export const useTemporalStore = () => usePedigreeStore.temporal;

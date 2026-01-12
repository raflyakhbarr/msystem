import { useReducer, useCallback } from 'react';
import { INITIAL_ITEM_FORM, INITIAL_GROUP_FORM } from '../../utils/cmdb-utils/constants';

const initialState = {
  // Modal states
  showItemModal: false,
  showConnectionModal: false,
  showGroupModal: false,
  showGroupConnectionModal: false,
  showExportModal: false,
  showVisibilityPanel: false,

  // Form states
  itemFormData: INITIAL_ITEM_FORM,
  groupFormData: INITIAL_GROUP_FORM,
  editItemMode: false,
  editGroupMode: false,
  currentItemId: null,
  currentGroupId: null,

  // Selection states
  selectionMode: 'freeroam',
  isSelecting: false,
  selectionStart: null,
  selectionEnd: null,
  selectedForHiding: new Set(),

  // Connection states
  selectedItemForConnection: null,
  selectedConnections: [],
  selectedGroupConnections: [],
  selectedGroupForConnection: null,
  selectedGroupToGroupConnections: [],
  selectedGroupToItemConnections: [],

  // UI states
  highlightMode: false,
  hiddenNodes: new Set(),
};

function stateReducer(state, action) {
  switch (action.type) {
    // Modal actions
    case 'OPEN_ITEM_MODAL':
      return {
        ...state,
        showItemModal: true,
        itemFormData: action.payload.formData || INITIAL_ITEM_FORM,
        editItemMode: action.payload.editMode || false,
        currentItemId: action.payload.itemId || null,
      };
    case 'CLOSE_ITEM_MODAL':
      return {
        ...state,
        showItemModal: false,
        itemFormData: INITIAL_ITEM_FORM,
        editItemMode: false,
        currentItemId: null,
      };
    case 'OPEN_GROUP_MODAL':
      return {
        ...state,
        showGroupModal: true,
        groupFormData: action.payload.formData || INITIAL_GROUP_FORM,
        editGroupMode: action.payload.editMode || false,
        currentGroupId: action.payload.groupId || null,
      };
    case 'CLOSE_GROUP_MODAL':
      return {
        ...state,
        showGroupModal: false,
        groupFormData: INITIAL_GROUP_FORM,
        editGroupMode: false,
        currentGroupId: null,
      };
    case 'OPEN_CONNECTION_MODAL':
      return {
        ...state,
        showConnectionModal: true,
        selectedItemForConnection: action.payload.item,
        selectedConnections: action.payload.connections || [],
        selectedGroupConnections: action.payload.groupConnections || [],
      };
    case 'CLOSE_CONNECTION_MODAL':
      return {
        ...state,
        showConnectionModal: false,
        selectedItemForConnection: null,
        selectedConnections: [],
        selectedGroupConnections: [],
      };
    case 'OPEN_GROUP_CONNECTION_MODAL':
      return {
        ...state,
        showGroupConnectionModal: true,
        selectedGroupForConnection: action.payload.group,
        selectedGroupToGroupConnections: action.payload.groupConnections || [],
        selectedGroupToItemConnections: action.payload.itemConnections || [],
      };
    case 'CLOSE_GROUP_CONNECTION_MODAL':
      return {
        ...state,
        showGroupConnectionModal: false,
        selectedGroupForConnection: null,
        selectedGroupToGroupConnections: [],
        selectedGroupToItemConnections: [],
      };
    case 'TOGGLE_EXPORT_MODAL':
      return { ...state, showExportModal: !state.showExportModal };
    case 'TOGGLE_VISIBILITY_PANEL':
      return { ...state, showVisibilityPanel: !state.showVisibilityPanel };

    // Form updates
    case 'UPDATE_ITEM_FORM':
      return { ...state, itemFormData: { ...state.itemFormData, ...action.payload } };
    case 'UPDATE_GROUP_FORM':
      return { ...state, groupFormData: { ...state.groupFormData, ...action.payload } };

    // Selection
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.payload };
    case 'START_SELECTION':
      return {
        ...state,
        isSelecting: true,
        selectionStart: action.payload,
        selectionEnd: action.payload,
      };
    case 'UPDATE_SELECTION':
      return { ...state, selectionEnd: action.payload };
    case 'END_SELECTION':
      return {
        ...state,
        isSelecting: false,
        selectionStart: null,
        selectionEnd: null,
      };
    case 'ADD_SELECTED_FOR_HIDING':
      return {
        ...state,
        selectedForHiding: new Set([...state.selectedForHiding, ...action.payload]),
      };
    case 'CLEAR_SELECTED_FOR_HIDING':
      return { ...state, selectedForHiding: new Set() };
    case 'TOGGLE_SELECTED_FOR_HIDING':
      const newSet = new Set(state.selectedForHiding);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, selectedForHiding: newSet };

    // Visibility
    case 'SET_HIDDEN_NODES':
      return { ...state, hiddenNodes: action.payload };
    case 'TOGGLE_NODE_VISIBILITY':
      const hiddenSet = new Set(state.hiddenNodes);
      if (hiddenSet.has(action.payload)) {
        hiddenSet.delete(action.payload);
      } else {
        hiddenSet.add(action.payload);
      }
      return { ...state, hiddenNodes: hiddenSet };

    // Highlight
    case 'SET_HIGHLIGHT_MODE':
      return { ...state, highlightMode: action.payload };

    // Connections
    case 'TOGGLE_CONNECTION':
      return {
        ...state,
        selectedConnections: state.selectedConnections.includes(action.payload)
          ? state.selectedConnections.filter(id => id !== action.payload)
          : [...state.selectedConnections, action.payload],
      };
    case 'TOGGLE_GROUP_CONNECTION':
      return {
        ...state,
        selectedGroupConnections: state.selectedGroupConnections.includes(action.payload)
          ? state.selectedGroupConnections.filter(id => id !== action.payload)
          : [...state.selectedGroupConnections, action.payload],
      };
    case 'TOGGLE_GROUP_TO_GROUP_CONNECTION':
      return {
        ...state,
        selectedGroupToGroupConnections: state.selectedGroupToGroupConnections.includes(action.payload)
          ? state.selectedGroupToGroupConnections.filter(id => id !== action.payload)
          : [...state.selectedGroupToGroupConnections, action.payload],
      };
    case 'TOGGLE_GROUP_TO_ITEM_CONNECTION':
      return {
        ...state,
        selectedGroupToItemConnections: state.selectedGroupToItemConnections.includes(action.payload)
          ? state.selectedGroupToItemConnections.filter(id => id !== action.payload)
          : [...state.selectedGroupToItemConnections, action.payload],
      };

    default:
      return state;
  }
}

export function useStateManagement() {
  const [state, dispatch] = useReducer(stateReducer, initialState);

  const actions = {
    openItemModal: useCallback((formData, editMode, itemId) => {
      dispatch({ type: 'OPEN_ITEM_MODAL', payload: { formData, editMode, itemId } });
    }, []),
    closeItemModal: useCallback(() => {
      dispatch({ type: 'CLOSE_ITEM_MODAL' });
    }, []),
    openGroupModal: useCallback((formData, editMode, groupId) => {
      dispatch({ type: 'OPEN_GROUP_MODAL', payload: { formData, editMode, groupId } });
    }, []),
    closeGroupModal: useCallback(() => {
      dispatch({ type: 'CLOSE_GROUP_MODAL' });
    }, []),
    openConnectionModal: useCallback((item, connections, groupConnections) => {
      dispatch({ type: 'OPEN_CONNECTION_MODAL', payload: { item, connections, groupConnections } });
    }, []),
    closeConnectionModal: useCallback(() => {
      dispatch({ type: 'CLOSE_CONNECTION_MODAL' });
    }, []),
    openGroupConnectionModal: useCallback((group, groupConnections, itemConnections) => {
      dispatch({ type: 'OPEN_GROUP_CONNECTION_MODAL', payload: { group, groupConnections, itemConnections } });
    }, []),
    closeGroupConnectionModal: useCallback(() => {
      dispatch({ type: 'CLOSE_GROUP_CONNECTION_MODAL' });
    }, []),
    toggleExportModal: useCallback(() => {
      dispatch({ type: 'TOGGLE_EXPORT_MODAL' });
    }, []),
    toggleVisibilityPanel: useCallback(() => {
      dispatch({ type: 'TOGGLE_VISIBILITY_PANEL' });
    }, []),
    updateItemForm: useCallback((updates) => {
      dispatch({ type: 'UPDATE_ITEM_FORM', payload: updates });
    }, []),
    updateGroupForm: useCallback((updates) => {
      dispatch({ type: 'UPDATE_GROUP_FORM', payload: updates });
    }, []),
    setSelectionMode: useCallback((mode) => {
      dispatch({ type: 'SET_SELECTION_MODE', payload: mode });
    }, []),
    startSelection: useCallback((point) => {
      dispatch({ type: 'START_SELECTION', payload: point });
    }, []),
    updateSelection: useCallback((point) => {
      dispatch({ type: 'UPDATE_SELECTION', payload: point });
    }, []),
    endSelection: useCallback(() => {
      dispatch({ type: 'END_SELECTION' });
    }, []),
    addSelectedForHiding: useCallback((nodeIds) => {
      dispatch({ type: 'ADD_SELECTED_FOR_HIDING', payload: nodeIds });
    }, []),
    clearSelectedForHiding: useCallback(() => {
      dispatch({ type: 'CLEAR_SELECTED_FOR_HIDING' });
    }, []),
    toggleSelectedForHiding: useCallback((nodeId) => {
      dispatch({ type: 'TOGGLE_SELECTED_FOR_HIDING', payload: nodeId });
    }, []),
    setHiddenNodes: useCallback((nodes) => {
      dispatch({ type: 'SET_HIDDEN_NODES', payload: nodes });
    }, []),
    toggleNodeVisibility: useCallback((nodeId) => {
      dispatch({ type: 'TOGGLE_NODE_VISIBILITY', payload: nodeId });
    }, []),
    setHighlightMode: useCallback((mode) => {
      dispatch({ type: 'SET_HIGHLIGHT_MODE', payload: mode });
    }, []),
    toggleConnection: useCallback((id) => {
      dispatch({ type: 'TOGGLE_CONNECTION', payload: id });
    }, []),
    toggleGroupConnection: useCallback((id) => {
      dispatch({ type: 'TOGGLE_GROUP_CONNECTION', payload: id });
    }, []),
    toggleGroupToGroupConnection: useCallback((id) => {
      dispatch({ type: 'TOGGLE_GROUP_TO_GROUP_CONNECTION', payload: id });
    }, []),
    toggleGroupToItemConnection: useCallback((id) => {
      dispatch({ type: 'TOGGLE_GROUP_TO_ITEM_CONNECTION', payload: id });
    }, []),
  };

  return { state, dispatch, actions };
}
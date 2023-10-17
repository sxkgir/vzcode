import { FileId } from '../types';

export const reducer = (state, action) => {
  switch (action.type) {
    // TODO phase this out
    case 'set_tab_list': {
      return { ...state, tabList: action.tabList };
    }
    case 'set_active_fileId': {
      return {
        ...state,
        activeFileId: action.activeFileId,
      };
    }
    case 'open_tab': {
      if (!state.tabList.includes(action.fileId)) {
        return {
          ...state,
          activeFileId: action.fileId,
          tabList: [...state.tabList, action.fileId],
        };
      } else {
        return {
          ...state,
          activeFileId: action.fileId,
        };
      }
    }
    case 'close_tab': {
      const i = state.tabList.findIndex(
        (fileId) => fileId === action.fileIdToRemove,
      );
      if (i != -1) {
        const newTabList = [
          ...state.tabList.slice(0, i),
          ...state.tabList.slice(i + 1),
        ];
        if (state.activeFileId === action.fileIdToRemove) {
          // set the new active file to the next tab over,
          if (newTabList.length > 0) {
            return {
              ...state,
              activeFileId:
                i === 0 ? newTabList[i] : newTabList[i - 1],
              tabList: newTabList,
            };
          } else {
            // or clear out the active file
            // if we've closed the last tab.
            return {
              ...state,
              activeFileId: null,
              tabList: newTabList,
            };
          }
        }
        return {
          ...state,
          tabList: newTabList,
        };
      }
      return {
        ...state,
      };
    }
    case 'multi_close_tab': {
      let newTabList = [...state.tabList]; // Create a copy of the tabList array.
      let newActiveFileId: FileId = state.activeFileId;
      action.idsToDelete.forEach((id) => {
        const i = newTabList.findIndex(
          (fileId) => fileId === id,
        );
        if (i !== -1) {
          // Remove the tab from the tab list.
          newTabList = [
            ...newTabList.slice(0, i),
            ...newTabList.slice(i + 1),
          ];
          // If we are closing the active file,
          if (newActiveFileId === id) {
            // set the new active file to the next tab over,
            if (newTabList.length > 0) {
              newActiveFileId =
                i === 0 ? newTabList[i] : newTabList[i - 1];
            } else {
              // or clear out the active file if we've closed the last tab.
              newActiveFileId = null;
            }
          }
        }
      });
      return {
        ...state,
        tabList: newTabList,
        activeFileId: newActiveFileId,
      };
    }
    // TODO eventually
    // case 'init_sharedb': {
    //   return {
    //     ...state,
    //     submitOperation: action.submitOperation
    //   }
    // }
    // case 'delete_file': {
    // case 'delete_directory': {
    // case 'create_file': {
    //           state.submitOperation((document) => ({
    //             ...document,
    //             files: {
    //               ...document.files,
    //               [randomId()]: { name:action.name, text: '' },
    //             },
    //           }))
    //           return state;

    //     }
    // case 'rename_file': {
    // ...
  }
  throw Error('Unknown action: ' + action.type);
};

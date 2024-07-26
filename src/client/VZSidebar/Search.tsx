import {
  useRef,
  useEffect,
  useContext,
  useState,
} from 'react';
import { Form } from '../bootstrap';
import { VZCodeContext } from '../VZCodeContext';
import { SearchFile, SearchMatch } from '../../types';
import { EditorView } from 'codemirror';
import { getExtensionIcon } from './FileListing';
import { CloseSVG, DirectoryArrowSVG } from '../Icons';

function jumpToPattern(
  editor: EditorView,
  pattern: string,
  line: number,
  index: number,
) {
  const position: number =
    editor.state.doc.line(line).from + index;

  editor.dispatch({
    selection: {
      anchor: position,
      head: position + pattern.length,
    },
    scrollIntoView: true,
    effects: EditorView.scrollIntoView(position, {
      y: 'center',
    }),
  });
}

function isResultElementWithinView(container, element) {
  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;
  
  const elementTop = element.offsetTop - container.offsetTop;
  const elementBottom = elementTop + element.clientHeight;

  return elementTop >= containerTop && elementBottom <= containerBottom;
}

export const Search = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const {
    search,
    setSearch,
    setActiveFileId,
    setSearchResults,
    setSearchFileVisibility,
    setSearchLineVisibility,
    setSearchFocusedIndex,
    shareDBDoc,
    editorCache,
  } = useContext(VZCodeContext);
  const { pattern, results, focusedIndex, focusedChildIndex, focused } = search;
  const inputRef = useRef(null);
  const files: [string, SearchFile][] = Object.entries(results)
    .filter(([_, file]) => file.visibility !== 'closed');

  useEffect(() => {
    if (isMounted) {
      // Only conduct a search after fully mounting and entering a new non-empty pattern
      setIsSearching(pattern.trim().length >= 1);

      // Search about 2 seconds after entering a new pattern
      const delaySearch = setTimeout(() => {
        if (
          pattern.trim().length >= 1 &&
          inputRef.current
        ) {
          setSearchResults(shareDBDoc);
          setIsSearching(false);
        }
      }, 2000);

      return () => clearTimeout(delaySearch);
    } else {
      setIsMounted(true);
    }
  }, [pattern]);

  const flattenResult = (fileId: string, file: SearchFile) => {
    setSearchFileVisibility(
      shareDBDoc,
      fileId,
      file.visibility === 'open'
        ? 'flattened'
        : 'open',
      file.name
    )
  };

  const closeResult = (fileId: string) => {
    setSearchFileVisibility(
      shareDBDoc,
      fileId,
      'closed',
      null
    );
  }

  const handleKeyDown = (event) => {
    event.preventDefault();

    const matchingLines: number = files[focusedIndex][1].matches.length;

    switch (event.key) {
      case 'Tab':
        // Focus the file heading
        setSearchFocusedIndex(focusedIndex, null);
        break;
      case 'ArrowUp':
        // No effect on first search listing
        if (focusedIndex == 0 && focusedChildIndex == null) break;

        if (focusedChildIndex === null) {
          // Toggle the previous file last child, if any
          const previousMatchingLines: number = files[focusedIndex - 1][1].matches.length;
          
          if (previousMatchingLines > 0) {
            setSearchFocusedIndex(focusedIndex - 1, previousMatchingLines - 1);
          } else {
            setSearchFocusedIndex(focusedIndex - 1, null);
          }
        } else if (focusedChildIndex === 0) {
          // Toggle the file
          setSearchFocusedIndex(focusedIndex, null);
        } else {
          // Toggle the previous matching line
          setSearchFocusedIndex(focusedIndex, focusedChildIndex - 1);
        }

        break;
      case 'ArrowDown':
        // Last matching line should have no effect
        if (focusedIndex == files.length - 1 && focusedChildIndex == matchingLines - 1) break;

        if (focusedChildIndex === null && matchingLines > 0) {
          // Toggle the first matching line
          setSearchFocusedIndex(focusedIndex, 0);
        } else if (focusedChildIndex == matchingLines - 1) {
          // Toggle the next file
          setSearchFocusedIndex(focusedIndex + 1, null);
        } else {
          // Toggle the next matching line
          setSearchFocusedIndex(focusedIndex, focusedChildIndex + 1);
        }

        break;
      case 'ArrowLeft':
        if (focusedChildIndex !== null) {
          setSearchFocusedIndex(focusedIndex, null);
        } else {
          flattenResult(files[focusedIndex][0], files[focusedIndex][1]);
        }
        break;
      case 'ArrowRight':
        if (files[focusedIndex][1].visibility !== 'open') {
          flattenResult(files[focusedIndex][0], files[focusedIndex][1]);
        } else if (focusedChildIndex === null) {
          setSearchFocusedIndex(focusedIndex, 0);
        }

        break;
      case 'Enter':
      case ' ':
        // Always jump to the file
        const fileId = files[focusedIndex][0];
        setActiveFileId(fileId);

        if (focusedChildIndex !== null) {
          // Jump to matching line
          const line: number = files[focusedIndex][1].matches[focusedChildIndex].line;
          const index: number = files[focusedIndex][1].matches[focusedChildIndex].index;

          if (editorCache.get(fileId)) {
            jumpToPattern(editorCache.get(fileId).editor, pattern, line, index);
          }
        }
        break;
      default:
        break;
    }

    // Ensure keyboard navigation keeps results within the current view
    const file: string = files[focusedIndex][0];
    const container = document.getElementById("sidebar-view-container");

    if (container) {
      if (focusedChildIndex === null) {
        const fileElement = document.getElementById(file);

        if (!(isResultElementWithinView(container, fileElement))) {
          fileElement.scrollIntoView({ block: "center" });
        }
      } else {
        const line = files[focusedIndex][1].matches[focusedChildIndex].line;
        const lineElement = document.getElementById(file + "-" + line);

        if (!(isResultElementWithinView(container, lineElement))) {
          lineElement.scrollIntoView({ block: "center" });
        }
      }
    }    
  }

  useEffect(() => {
    // Focus the search input on mount and keyboard shortcut invocation
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [focused]);

  return (
    <div>
      <Form.Group
        className="sidebar-search-form mb-3"
        controlId="searchName"
      >
        <Form.Control
          type="text"
          value={pattern}
          onChange={(event) => setSearch(event.target.value)}
          ref={inputRef}
          spellCheck="false"
        />
      </Form.Group>
      {Object.keys(results).length >= 1 &&
        pattern.trim().length >= 1 ? (
        <div
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="search-results">
          {files.map(([fileId, file]: [string, SearchFile], index) => {
            const matches = file.matches;
            return (
              <div
                className="search-result"
                key={file.name}
              >
                <div
                  onClick={() => {
                    setActiveFileId(fileId);
                    setSearchFocusedIndex(index, null);
                  }}
                  id={fileId}
                  className={`search-file-heading 
                      ${(focusedIndex == index && focusedChildIndex == null)
                      ? 'active' : ''}`}
                >
                  <div className="search-file-title">
                    <div
                      className="arrow-wrapper"
                      onClick={() => {
                        flattenResult(fileId, file);
                      }}
                      style={{
                        transform: `rotate(${file.visibility === 'open' ? 90 : 0}deg)`,
                      }}
                    >
                      <DirectoryArrowSVG />
                    </div>
                    <div className="search-file-name">
                      {getExtensionIcon(file.name)}
                      <h5>{file.name}</h5>
                    </div>
                  </div>
                  <div className="search-file-info">
                    {
                      (index == focusedIndex && focusedChildIndex == null) ? (
                        <span
                          className="search-file-close"
                          onClick={(event) => {
                            event.stopPropagation();
                            closeResult(fileId);
                          }}
                        >
                          <CloseSVG />
                        </span>
                      ) : (
                        <h6 className="search-file-count">
                          {matches.length}
                        </h6>
                      )
                    }
                  </div>
                </div>
                <div
                  className="search-file-lines">
                  {file.visibility !== 'flattened' &&
                    file.matches.map((match, childIndex) => {
                      const before = match.text.substring(
                        0,
                        match.index,
                      );
                      const hit = match.text.substring(
                        match.index,
                        match.index + pattern.length,
                      );
                      const after = match.text.substring(
                        match.index + pattern.length,
                      );

                      const identifier = file.name + "-" + match.line;

                      return (
                        <div
                          key={identifier}
                          tabIndex={(index == focusedIndex) ? 0 : -1}
                          id={fileId + "-" + match.line}
                          className={`search-line 
                              ${(focusedIndex == index && focusedChildIndex == childIndex)
                              ? 'active' : ''}`}
                        >
                          <p
                            key={
                              file.name +
                              ' - ' +
                              match.line +
                              ' - ' +
                              match.index
                            }
                            onClick={() => {
                              setSearchFocusedIndex(index, childIndex);

                              if (editorCache.get(fileId)) {
                                jumpToPattern(editorCache.get(fileId).editor,
                                  pattern, match.line, match.index);
                              }
                            }}
                          >
                            {before}
                            <span className="search-pattern">
                              {hit}
                            </span>
                            {after}
                          </p>
                          {
                            (focusedIndex == index && focusedChildIndex === childIndex) && (
                              <span
                                className="search-file-close"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSearchLineVisibility(shareDBDoc, fileId, match.line);
                                }}
                              >
                                <CloseSVG />
                              </span>
                            )
                          }
                        </div>
                      );
                    })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="search-state">
          <h6>
            {isSearching ? 'Searching...' : 'No Results'}
          </h6>
        </div>
      )}
    </div>
  );
};

// App.js
import React, { useState, useMemo } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  FaFileAlt,
  FaFileImage,
  FaFileCode,
  FaFolder,
  FaDownload,
  FaSearch,
  FaFilePdf,
  FaFileArchive,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";
import "./index.css";

/*
  Note: screenshot uploaded earlier:
  /mnt/data/460a419f-39d4-4954-a9e5-9ab2d44fdda8.png
*/

export default function App() {
  const [zipContent, setZipContent] = useState(null); // JSZip instance
  const [structure, setStructure] = useState({}); // nested tree { name: null | {...} }
  const [openFolders, setOpenFolders] = useState(() => new Set()); // set of folder paths
  const [selectedFile, setSelectedFile] = useState(null); // full path
  const [preview, setPreview] = useState(null); // { type, data/url }
  const [fileSize, setFileSize] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ---------- ZIP UPLOAD (ZIP ONLY) ----------
  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      alert("Please upload a .zip file only.");
      return;
    }

    try {
      const zip = await JSZip.loadAsync(file);
      const tree = buildTreeFromZip(zip);
      setZipContent(zip);
      setStructure(tree);
      setOpenFolders(new Set());
      setSelectedFile(null);
      setPreview(null);
      setFileSize(null);
      setSearchQuery("");
    } catch (err) {
      console.error(err);
      alert("Failed reading zip file.");
    }
  };

  // build nested object tree from zip.files
  const buildTreeFromZip = (zip) => {
    const tree = {};
    Object.keys(zip.files).forEach((filename) => {
      // ignore directory entries that are just empty or root slashes
      if (!filename || filename === "/") return;
      const parts = filename.split("/").filter(Boolean);
      let current = tree;
      parts.forEach((part, i) => {
        const last = i === parts.length - 1;
        if (!current[part]) {
          current[part] = last ? null : {};
        }
        current = current[part] ?? {};
      });
    });
    return tree;
  };

  // ---------- ICON SELECTION ----------
  const getIconForName = (name, isFolder) => {
    if (isFolder) return <FaFolder className="icon folder-icon" />;
    const lower = name.toLowerCase();
    if (lower.endsWith(".zip")) return <FaFileArchive className="icon zip-icon" />;
    if (lower.endsWith(".pdf")) return <FaFilePdf className="icon pdf-icon" />;
    if (lower.match(/\.(png|jpe?g|gif|webp|bmp)$/)) return <FaFileImage className="icon img-icon" />;
    if (lower.match(/\.(html|css|js|json|ts|jsx|tsx|md|xml)$/)) return <FaFileCode className="icon code-icon" />;
    return <FaFileAlt className="icon text-icon" />;
  };

  // ---------- FOLDER TOGGLE ----------
  const toggleFolder = (folderPath) => {
    const next = new Set(openFolders);
    if (next.has(folderPath)) next.delete(folderPath);
    else next.add(folderPath);
    setOpenFolders(next);
  };

  // ---------- SEARCH FILTER (recursive) ----------
  const filterTree = (node, q) => {
    if (!q) return node;

    const out = {};
    for (const [name, content] of Object.entries(node)) {
      const nameMatches = name.toLowerCase().includes(q);
      if (content === null) {
        if (nameMatches) out[name] = null;
      } else {
        const sub = filterTree(content, q);
        if (nameMatches || Object.keys(sub).length > 0) out[name] = sub;
      }
    }
    return out;
  };

  const filteredStructure = useMemo(() => filterTree(structure, searchQuery.trim().toLowerCase()), [structure, searchQuery]);

  // ---------- PICK A FILE TO PREVIEW ----------
  const previewFile = async (fullPath, name) => {
    if (!zipContent) return;
    const fileObj = zipContent.file(fullPath);
    if (!fileObj) return;

    setSelectedFile(fullPath);
    setFileSize((fileObj._data?.uncompressedSize ?? 0) / 1024 <= 0 ? "0 KB" : `${(fileObj._data.uncompressedSize / 1024).toFixed(2)} KB`);

    const blob = await fileObj.async("blob");
    const lower = name.toLowerCase();

    // PDF
    if (lower.endsWith(".pdf")) {
      const url = URL.createObjectURL(blob);
      setPreview({ type: "pdf", url });
      return;
    }

    // Images
    if (lower.match(/\.(png|jpe?g|gif|webp|bmp)$/)) {
      const url = URL.createObjectURL(blob);
      setPreview({ type: "image", url });
      return;
    }

    // Text-like
    if (lower.match(/\.(txt|md|json|js|css|html|xml|csv|ts|jsx|tsx)$/)) {
      const text = await fileObj.async("text");
      setPreview({ type: "text", text });
      return;
    }

    // Unknown binary
    setPreview({ type: "unknown", blob });
  };

  // ---------- DOWNLOAD ----------
  const downloadFile = async () => {
    if (!zipContent || !selectedFile) return;
    const f = zipContent.file(selectedFile);
    if (!f) return;
    const blob = await f.async("blob");
    saveAs(blob, selectedFile.split("/").pop());
  };

  // ---------- RENDER TREE RECURSIVELY ----------
  const renderTree = (node, basePath = "") => {
    return Object.entries(node).map(([name, content]) => {
      const fullPath = basePath + name;
      const isFolder = content !== null;
      const isOpen = openFolders.has(fullPath);
      // size for file (if available)
      let sizeLabel = "";
      if (!isFolder && zipContent?.files?.[fullPath]?._data?.uncompressedSize) {
        const kb = zipContent.files[fullPath]._data.uncompressedSize / 1024;
        sizeLabel = `${kb < 1 ? "<1" : kb.toFixed(2)} KB`;
      }

      return (
        <div key={fullPath} className="tree-entry">
          {isFolder ? (
            <>
              <div className="folder-row" onClick={() => toggleFolder(fullPath)}>
                <div className="folder-toggle-icon">
                  {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                </div>
                {getIconForName(name, true)}
                <div className="folder-label">{name}</div>
              </div>

              {isOpen && (
                <div className="folder-children">
                  {renderTree(content, fullPath + "/")}
                </div>
              )}
            </>
          ) : (
            <div className="file-row" onClick={() => previewFile(fullPath, name)}>
              {getIconForName(name, false)}
              <div className="file-label">{name}</div>
              <div className="file-size">{sizeLabel}</div>
            </div>
          )}
        </div>
      );
    });
  };

  // ---------- CLEANUP preview object URLs when structure changes ----------
  React.useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  return (
    <div className="app-root">
      <header className="topbar glass-card">
        <div className="brand">E-Zip Viewer</div>
        <div className="top-actions">
          <label className="upload-btn glass-card">
            📁 Upload .zip
            <input type="file" accept=".zip" onChange={handleZipUpload} style={{ display: "none" }} />
          </label>

          <div className="search-wrap glass-card">
            <FaSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Search files or folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="main-grid">
        {/* LEFT: tree */}
        <aside className="ezip-tree glass-card">
          <h4 className="panel-title">Files & Folders</h4>
          <div className="tree-scroll">
            {Object.keys(filteredStructure).length === 0 ? (
              <div className="empty-note">No files — upload a ZIP to begin</div>
            ) : (
              renderTree(filteredStructure)
            )}
          </div>
        </aside>

        {/* RIGHT: preview */}
        <section className="ezip-preview glass-card">
          <h4 className="panel-title">Preview</h4>

          {!preview ? (
            <div className="preview-empty">Select a file to preview (text, images, PDF supported)</div>
          ) : (
            <>
              <div className="preview-meta">
                <div className="preview-path">{selectedFile}</div>
                <div className="preview-size">{fileSize}</div>
              </div>

              <div className="preview-area">
                {preview.type === "text" && <pre className="preview-text">{preview.text}</pre>}

                {preview.type === "image" && (
                  <img className="preview-image" src={preview.url} alt="preview" />
                )}

                {preview.type === "pdf" && (
                  <iframe className="preview-pdf" src={preview.url} title="PDF Preview" />
                )}

                {preview.type === "unknown" && (
                  <div className="preview-unknown">No preview available for this file type.</div>
                )}
              </div>

              <div className="preview-actions">
                <button className="btn-primary" onClick={downloadFile}><FaDownload /> Download</button>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <span className="madeby">Made by <span className="anush">Anush</span></span>
      </footer>
    </div>
  );
}
// End of App.js
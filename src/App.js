import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  FaFileAlt,
  FaFileImage,
  FaFileCode,
  FaFolder,
  FaDownload,
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  const [zipContent, setZipContent] = useState(null);
  const [structure, setStructure] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileSize, setFileSize] = useState(null);

  // Handle ZIP upload
  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const zip = await JSZip.loadAsync(file);
    const tree = {};

    Object.keys(zip.files).forEach((filename) => {
      const parts = filename.split("/");
      let current = tree;
      parts.forEach((part, i) => {
        if (!part) return;
        if (!current[part]) {
          current[part] = i === parts.length - 1 ? null : {};
        }
        current = current[part];
      });
    });

    setStructure(tree);
    setZipContent(zip);
    setPreview(null);
    setSelectedFile(null);
  };

  // Icon by file type
  const getFileIcon = (name, isFolder) => {
    if (isFolder) return <FaFolder className="text-warning me-2" />;
    if (name.match(/\.(png|jpg|jpeg|gif)$/i))
      return <FaFileImage className="text-info me-2" />;
    if (name.match(/\.(html|css|js|json|md)$/i))
      return <FaFileCode className="text-success me-2" />;
    return <FaFileAlt className="text-light me-2" />;
  };

  // Handle file click
  const handleFileClick = async (path, name) => {
    if (!zipContent) return;
    const file = zipContent.file(path);
    if (!file) return; // folder clicked

    setSelectedFile(path);
    setFileSize((file._data.uncompressedSize / 1024).toFixed(2) + " KB");

    const blob = await file.async("blob");
    const textExtensions = [".txt", ".md", ".json", ".js", ".html", ".css"];

    if (textExtensions.some((ext) => name.endsWith(ext))) {
      const text = await file.async("text");
      setPreview({ type: "text", content: text });
    } else if (name.match(/\.(png|jpg|jpeg|gif)$/i)) {
      const imgUrl = URL.createObjectURL(blob);
      setPreview({ type: "image", content: imgUrl });
    } else {
      setPreview({ type: "unknown", content: blob });
    }
  };

  const downloadSelected = async () => {
    if (!zipContent || !selectedFile) return;
    const file = zipContent.file(selectedFile);
    if (!file) return;
    const blob = await file.async("blob");
    saveAs(blob, selectedFile.split("/").pop());
  };

  // Render folder structure
  const renderStructure = (node, path = "") => {
    return (
      <div className="ms-3">
        {Object.entries(node).map(([name, content]) => {
          const isFolder = content !== null;
          return (
            <div key={path + name} className="file-card p-2 mb-2 rounded">
              <div
                className="d-flex align-items-center"
                role="button"
                onClick={() =>
                  isFolder ? null : handleFileClick(path + name, name)
                }
              >
                {getFileIcon(name, isFolder)}
                <span className="file-name">{name}</span>
              </div>

              {isFolder && (
                <div className="ms-3 mt-2 border-start border-secondary ps-3">
                  {renderStructure(content, path + name + "/")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-dark text-light min-vh-100 p-4">
      <h1 className="text-center mb-4">📦 ZIP File Explorer</h1>

      <div className="text-center mb-4">
        <input
          type="file"
          accept=".zip"
          onChange={handleZipUpload}
          className="form-control w-50 mx-auto bg-secondary text-light border-0"
        />
      </div>

      {structure && Object.keys(structure).length > 0 && (
        <div className="row">
          {/* Explorer */}
          <div className="col-md-4 border-end border-secondary">
            <h5>Files & Folders</h5>
            <div className="file-tree">{renderStructure(structure)}</div>
          </div>

          {/* Preview */}
          <div className="col-md-8 ps-4">
            <h5>Preview</h5>
            {preview ? (
              <div className="preview-area mt-3">
                <p className="text-muted">
                  <strong>Selected:</strong> {selectedFile} <br />
                  <strong>Size:</strong> {fileSize}
                </p>

                {preview.type === "text" ? (
                  <pre
                    className="bg-secondary p-3 rounded text-light"
                    style={{ maxHeight: "65vh", overflowY: "auto" }}
                  >
                    {preview.content}
                  </pre>
                ) : preview.type === "image" ? (
                  <img
                    src={preview.content}
                    alt={selectedFile}
                    className="img-fluid rounded border border-secondary"
                  />
                ) : (
                  <p className="text-warning">
                    No preview available. You can download this file.
                  </p>
                )}

                <button
                  className="btn btn-outline-info mt-3"
                  onClick={downloadSelected}
                >
                  <FaDownload className="me-2" />
                  Download
                </button>
              </div>
            ) : (
              <p className="text-secondary mt-3">
                Select a file to preview or download.
              </p>
            )}
          </div>
        </div>
      )}

      <footer className="text-center mt-5 text-secondary">
        <small>Made by <strong>Anush</strong></small>
      </footer>
    </div>
  );
}

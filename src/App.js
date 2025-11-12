import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  const [zipContent, setZipContent] = useState(null);
  const [structure, setStructure] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Handle ZIP upload
  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const zip = await JSZip.loadAsync(file);
    const tree = {};

    // Build directory tree
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

  // Handle file click
  const handleFileClick = async (path) => {
    if (!zipContent) return;
    const file = zipContent.file(path);
    if (!file) return; // It's a folder

    setSelectedFile(path);
    const blob = await file.async("blob");
    const textExtensions = [".txt", ".md", ".json", ".js", ".html", ".css"];

    if (textExtensions.some((ext) => path.endsWith(ext))) {
      const text = await file.async("text");
      setPreview({ type: "text", content: text });
    } else if (path.match(/\.(png|jpg|jpeg|gif)$/i)) {
      const imgUrl = URL.createObjectURL(blob);
      setPreview({ type: "image", content: imgUrl });
    } else {
      setPreview(null);
      const confirmDownload = window.confirm(
        `Cannot preview "${path}". Download instead?`
      );
      if (confirmDownload) saveAs(blob, path.split("/").pop());
    }
  };

  // Recursive renderer
  const renderTree = (node, path = "") => (
    <ul className="list-unstyled ms-3">
      {Object.entries(node).map(([name, content]) => (
        <li key={path + name}>
          {content ? (
            <details>
              <summary className="fw-semibold">{name}</summary>
              {renderTree(content, path + name + "/")}
            </details>
          ) : (
            <div
              className="text-primary file-item"
              role="button"
              onClick={() => handleFileClick(path + name)}
            >
              📄 {name}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="container py-4">
      <h1 className="mb-3 text-center">📦 ZIP File Explorer</h1>

      <div className="mb-4 text-center">
        <input
          type="file"
          accept=".zip"
          onChange={handleZipUpload}
          className="form-control w-50 mx-auto"
        />
      </div>

      {structure && Object.keys(structure).length > 0 && (
        <div className="row">
          <div className="col-md-4 border-end">
            <h5>File Explorer</h5>
            <div className="file-tree">{renderTree(structure)}</div>
          </div>

          <div className="col-md-8">
            <h5>Preview</h5>
            {preview ? (
              preview.type === "text" ? (
                <pre className="border rounded p-3 bg-light" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  {preview.content}
                </pre>
              ) : (
                <img
                  src={preview.content}
                  alt={selectedFile}
                  className="img-fluid rounded border"
                />
              )
            ) : (
              <p className="text-muted mt-3">
                Select a file to preview or download
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

import React, { useEffect, useState } from "react";
import {
  getFilesByLead,
  uploadFile,
  deleteFile
} from "../../services/fileService";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

import ConfirmDialog from "../ui/ConfirmDialog";
import NotificationSnackbar from "../ui/NotificationSnackbar";

import "../../assets/styles/FilesTab.scss";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FilesTab = ({ leadId }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  useEffect(() => {
    if (leadId) fetchFiles();
  }, [leadId]);

  const fetchFiles = async () => {
    const data = await getFilesByLead(leadId);
    setFiles(Array.isArray(data) ? data : []);
  };

  /* -------------------------
     FILE SELECT
  ------------------------- */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setSnackbar({
        open: true,
        message: "File size should not exceed 10 MB.",
        severity: "error"
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setHasUploaded(false); // reset upload state on new file
  };

  /* -------------------------
     UPLOAD
  ------------------------- */
  const handleUpload = async () => {
    if (!selectedFile || hasUploaded) return;

    try {
      setUploading(true);
      await uploadFile(leadId, selectedFile);

      setSnackbar({
        open: true,
        message: "File uploaded successfully.",
        severity: "success"
      });

      setHasUploaded(true);
      fetchFiles();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to upload file.",
        severity: "error"
      });
    } finally {
      setUploading(false);
    }
  };

  /* -------------------------
     DELETE (CONFIRM FLOW)
  ------------------------- */
  const askDelete = (id) => {
    setFileToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteFile(fileToDelete);

      setSnackbar({
        open: true,
        message: "File deleted successfully.",
        severity: "success"
      });

      fetchFiles();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete file.",
        severity: "error"
      });
    } finally {
      setConfirmOpen(false);
      setFileToDelete(null);
    }
  };

  /* -------------------------
     DATE FORMATTER (SAFE)
  ------------------------- */
  const formatDate = (date) => {
    if (!date) return "Just now";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "Just now" : d.toLocaleString();
  };

  return (
    <div className="files-tab">

      {/* LEFT */}
      <div className="files-left">
        <div className="detail-title">
          <h4>Upload File</h4>
        </div>

        <label className="file-upload-box">
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            hidden
          />
          <span>
            {selectedFile ? selectedFile.name : "Click to select file"}
          </span>
        </label>

        <small className="file-hint">Max file size: 10 MB</small>

        <button
          className="primary-btn"
          onClick={handleUpload}
          disabled={!selectedFile || uploading || hasUploaded}
        >
          {uploading
            ? "Uploading..."
            : hasUploaded
            ? "Uploaded"
            : "Upload File"}
        </button>
      </div>

      {/* RIGHT */}
      <div className="files-right">
        <div className="detail-title">
          <h4>Files Log</h4>
        </div>

        <div className="files-list">
          {files.length === 0 && <p>No files uploaded yet.</p>}

          {files.map((f) => (
            <div key={f.id} className="file-item">
              <p className="file-name">{f.file_name}</p>

              <div className="file-footer">
                <small>{formatDate(f.created_at)}</small>

                <div className="file-actions">
                  <a
                    href={`http://localhost:5000/${f.file_path}`}
                    download
                    title="Download"
                    className="file-action-btn"
                  >
                    <DownloadOutlinedIcon />
                  </a>

                  <div
                    className="file-action-btn delete"
                    title="Delete"
                    onClick={() => askDelete(f.id)}
                  >
                    <DeleteOutlineIcon />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete File"
        message="This file will be permanently deleted. Are you sure?"
        confirmText="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      {/* SNACKBAR */}
      <NotificationSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() =>
          setSnackbar((prev) => ({ ...prev, open: false }))
        }
      />
    </div>
  );
};

export default FilesTab;

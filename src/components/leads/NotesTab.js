import React, { useEffect, useState } from "react";
import {
  getNotesByLead,
  createNote,
  updateNote,
  deleteNote
} from "../../services/noteService";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import ConfirmDialog from "../ui/ConfirmDialog";
import NotificationSnackbar from "../ui/NotificationSnackbar";

import "../../assets/styles/NotesTab.scss";

const NotesTab = ({ leadId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  useEffect(() => {
    if (leadId) fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    const data = await getNotesByLead(leadId);
    setNotes(Array.isArray(data) ? data : []);
  };

  /* -------------------------
     ADD NOTE
  ------------------------- */
  const handleAdd = async () => {
    if (!newNote.trim()) {
      setSnackbar({
        open: true,
        message: "Note cannot be empty.",
        severity: "warning"
      });
      return;
    }

    try {
      await createNote(leadId, newNote);

      setSnackbar({
        open: true,
        message: "Note added successfully.",
        severity: "success"
      });

      setNewNote("");
      fetchNotes();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to add note.",
        severity: "error"
      });
    }
  };

  /* -------------------------
     EDIT NOTE
  ------------------------- */
  const handleEdit = async (id, text) => {
    try {
      await updateNote(id, text);

      setSnackbar({
        open: true,
        message: "Note updated successfully.",
        severity: "success"
      });

      setEditingNote(null);
      fetchNotes();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to update note.",
        severity: "error"
      });
    }
  };

  /* -------------------------
     DELETE (CONFIRM FLOW)
  ------------------------- */
  const askDelete = (id) => {
    setNoteToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteNote(noteToDelete);

      setSnackbar({
        open: true,
        message: "Note deleted successfully.",
        severity: "success"
      });

      fetchNotes();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete note.",
        severity: "error"
      });
    } finally {
      setConfirmOpen(false);
      setNoteToDelete(null);
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
    <div className="notes-tab">

      {/* LEFT */}
      <div className="notes-left">
        <div className="detail-title">
          <h4>Add Note</h4>
        </div>

        <textarea
          className="new-note-input"
          placeholder="Write a note..."
          rows={4}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />

        <button className="primary-btn" onClick={handleAdd}>
          Add Note
        </button>
      </div>

      {/* RIGHT */}
      <div className="notes-right">
        <div className="detail-title">
          <h4>Notes Log</h4>
        </div>

        <div className="notes-list">
          {notes.length === 0 && <p>No notes yet.</p>}

          {notes.map((n) => (
            <div key={n.id} className="note-item">

              {editingNote === n.id ? (
                <>
                  <textarea
                    rows={3}
                    value={n.note_text}
                    onChange={(e) => {
                      const updated = notes.map((item) =>
                        item.id === n.id
                          ? { ...item, note_text: e.target.value }
                          : item
                      );
                      setNotes(updated);
                    }}
                  />

                <button
                  className="primary-btn save-btn"
                  onClick={() => handleEdit(n.id, n.note_text)}
                >
                  <SaveOutlinedIcon />
                  Save
                </button>

                </>
              ) : (
                <>
                  <p>{n.note_text}</p>

                  <div className="note-footer">
                    <small>{formatDate(n.created_at)}</small>

                    <div className="note-actions">
                      <EditOutlinedIcon
                        onClick={() => setEditingNote(n.id)}
                      />
                      <DeleteOutlineIcon
                        onClick={() => askDelete(n.id)}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
          ))}
        </div>
      </div>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Note"
        message="This note will be permanently deleted. Are you sure?"
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

export default NotesTab;

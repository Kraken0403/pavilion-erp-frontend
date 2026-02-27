import React, { useEffect, useState } from "react";
import {
  getActivitiesByLead,
  createActivity,
  deleteActivity
} from "../../services/activityService";

import { formatDateTime, formatDate } from "../../utils/dateFormatter";

import CallIcon from "@mui/icons-material/Call";
import EventIcon from "@mui/icons-material/Event";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import FlagIcon from "@mui/icons-material/Flag";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

import ConfirmDialog from "../ui/ConfirmDialog";
import NotificationSnackbar from "../ui/NotificationSnackbar";

import "../../assets/styles/ActivitiesTab.scss";

const DESCRIPTION_CHAR_LIMIT = 200;

const ACTIVITY_TYPES = [
  { value: "call", label: "Call", icon: <CallIcon /> },
  { value: "meeting", label: "Meeting", icon: <EventIcon /> },
  { value: "task", label: "Task", icon: <TaskAltIcon /> },
  { value: "deadline", label: "Deadline", icon: <FlagIcon /> }
];

const iconMap = {
  call: <CallIcon />,
  meeting: <EventIcon />,
  task: <TaskAltIcon />,
  deadline: <FlagIcon />
};

const ActivitiesTab = ({ leadId }) => {
  const [activities, setActivities] = useState([]);

  const [activity, setActivity] = useState({
    type: "call",
    title: "",
    description: "",
    due_date: "",
    due_time: "",
    status: "open"
  });

  const [typeOpen, setTypeOpen] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  /* ================= FETCH ================= */

  useEffect(() => {
    if (leadId) fetchActivities();
  }, [leadId]);

  const fetchActivities = async () => {
    try {
      const res = await getActivitiesByLead(leadId);

      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.activities)
        ? res.activities
        : [];

      setActivities(
        list
          .map((a) => ({
            ...a,
            type: a.type || a.activity_type || "task"
          }))
          .sort(
            (a, b) =>
              new Date(`${a.due_date || ""} ${a.due_time || ""}`) -
              new Date(`${b.due_date || ""} ${b.due_time || ""}`)
          )
      );
    } catch (e) {
      console.error("Failed to load activities", e);
      setActivities([]);
    }
  };

  /* ================= FORM ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "description" && value.length > DESCRIPTION_CHAR_LIMIT) return;

    setActivity((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();

    if (!activity.title.trim()) {
      setSnackbar({
        open: true,
        message: "Title is required.",
        severity: "warning"
      });
      return;
    }

    try {
      await createActivity(leadId, activity);
      await fetchActivities();

      setSnackbar({
        open: true,
        message: "Activity added successfully.",
        severity: "success"
      });

      setActivity({
        type: "call",
        title: "",
        description: "",
        due_date: "",
        due_time: "",
        status: "open"
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to add activity.",
        severity: "error"
      });
    }
  };

  /* ================= DELETE ================= */

  const askDelete = (id) => {
    setActivityToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteActivity(activityToDelete);
      await fetchActivities();

      setSnackbar({
        open: true,
        message: "Activity deleted successfully.",
        severity: "success"
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to delete activity.",
        severity: "error"
      });
    } finally {
      setConfirmOpen(false);
      setActivityToDelete(null);
    }
  };

  /* ================= UI ================= */

  const selectedType = ACTIVITY_TYPES.find(
    (t) => t.value === activity.type
  );

  return (
    <div className="activities-tab">

      {/* LEFT */}
      <div className="activities-left">
        <div className="detail-title">
          <h4>Add Activity</h4>
        </div>

        <form onSubmit={handleAddActivity}>

          {/* TYPE + TITLE */}
          <div className="act-flex">
            <div className="type">
              <label>Type</label>
              <div className="type-dropdown">
                <button
                  type="button"
                  className="type-btn"
                  onClick={() => setTypeOpen(!typeOpen)}
                >
                  {selectedType.icon}
                  <span>{selectedType.label}</span>
                  <ArrowDropDownIcon />
                </button>

                {typeOpen && (
                  <div className="type-menu">
                    {ACTIVITY_TYPES.map((t) => (
                      <div
                        key={t.value}
                        className="type-option"
                        onClick={() => {
                          setActivity((prev) => ({
                            ...prev,
                            type: t.value
                          }));
                          setTypeOpen(false);
                        }}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="act-input">
              <label>Title</label>
              <input
                name="title"
                value={activity.title}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <label>Description</label>
          <textarea
            name="description"
            value={activity.description}
            onChange={handleChange}
            rows={5}
          />
          <div className="char-count">
            {activity.description.length} / {DESCRIPTION_CHAR_LIMIT}
          </div>

          {/* DATE + TIME */}
          <div className="act-flex">
            <div className="act-input">
              <label>Date</label>
              <input
                type="date"
                name="due_date"
                value={activity.due_date}
                onChange={handleChange}
              />
              {activity.due_date && (
                <div className="date-preview">
                  {formatDate(activity.due_date)}
                </div>
              )}
            </div>

            <div className="act-input">
              <label>Time</label>
              <input
                type="time"
                name="due_time"
                value={activity.due_time}
                onChange={handleChange}
              />
              {activity.due_time && (
                <div className="date-preview">
                  {activity.due_time.slice(0, 5)}
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="primary-btn">
            Add Activity
          </button>
        </form>
      </div>

      {/* RIGHT */}
      <div className="activities-right">
        <div className="detail-title">
          <h4>Activity Log</h4>
        </div>

        <div className="timeline">
          {activities.length === 0 && <p>No activities yet.</p>}

          {activities.map((a) => (
            <div key={a.id} className="timeline-item-wrapper">

              <div
                className={`timeline-item ${a.status === "completed" ? "done" : ""}`}
              >
                <div className="icon">{iconMap[a.type]}</div>

                <div className="content">
                  <div className="top">
                    <h4>{a.title}</h4>
                    <span className="type">{a.type}</span>
                  </div>

                  <p>{a.description}</p>

                  {a.due_date && (
                    <div className="meta">
                      {formatDateTime(a.due_date, a.due_time)}
                    </div>
                  )}
                </div>

                <div className="actions">
                  <DeleteOutlineIcon
                    className="delete"
                    onClick={() => askDelete(a.id)}
                  />
                </div>
              </div>

              <div className="timeline-footer">
                <label className="complete-check">
                  <input
                    type="checkbox"
                    checked={a.status === "completed"}
                    onChange={() => {
                      setActivities((prev) =>
                        prev.map((item) =>
                          item.id === a.id
                            ? {
                                ...item,
                                status:
                                  item.status === "completed"
                                    ? "open"
                                    : "completed"
                              }
                            : item
                        )
                      );
                    }}
                  />
                  <span>Mark as completed</span>
                </label>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Activity"
        message="This activity will be permanently deleted. Are you sure?"
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

export default ActivitiesTab;

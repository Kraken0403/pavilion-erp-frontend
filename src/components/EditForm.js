// src/components/EditForm.js
import React, { useState, useEffect } from 'react';
import '../assets/styles/EditForm.scss';
import { createMeeting, getMeetingsByLead } from '../services/meetingService';
import { getAllCustomFields } from '../services/customFieldServices';
import { getAllUsers } from '../services/userServices';
import ActivitiesTab from "./leads/ActivitiesTab";
import NotesTab from "./leads/NotesTab";
import FilesTab from "./leads/FilesTab";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import {
  IconButton,
  Menu,
  MenuItem
} from '@mui/material'

// ------------------------------------------------------
// Reusable Input Component
// ------------------------------------------------------
const InputField = ({ label, type, id, name, value, onChange, options = [], disabled }) => {
  if (type === "select") {
    return (
      <div className="input-field">
        <label htmlFor={id}>{label}:</label>
        <select id={id} name={name} value={value ?? ""} onChange={onChange} disabled={disabled}>
          <option value="" disabled>Please select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className="input-field">
        <label htmlFor={id}>{label}:</label>
        <textarea
          id={id}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          rows="4"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="input-field">
      <label htmlFor={id}>{label}:</label>
      <input
        type={type}
        id={id}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};

// ------------------------------------------------------
// MAIN EDIT FORM COMPONENT
// ------------------------------------------------------
const EditForm = ({
  leadData,
  handleChange,
  sendEmailtoSp,
  handleSubmit,
  activeTab,
  customFields: initialCustomFields,
  handleCustomFieldsUpdate,
  onSendQuotation
}) => {

  const isCreateMode = !leadData?.id;


  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const actionsOpen = Boolean(actionsAnchorEl);

  // Dirty check
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const isDirty = isCreateMode
  ? true
  : initialSnapshot
    ? JSON.stringify(leadData) !== JSON.stringify(initialSnapshot)
    : false;


  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});

  const [meetings, setMeetings] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [meetingDetails, setMeetingDetails] = useState({
    meeting_date: "",
    meeting_location: "",
    meeting_notes: "",
  });

  const priorityOptions = ["low", "medium", "high"];
  const statusOptions = ["new", "in-progress", "closed", "won", "lost"];

  useEffect(() => {
    if (!initialSnapshot && leadData?.id) {
      setInitialSnapshot(JSON.parse(JSON.stringify(leadData)));
    }
  }, [leadData]);
  // ------------------------------------------------------
  // Fetch Users & Custom Fields
  // ------------------------------------------------------
  useEffect(() => {
    fetchUsers();
    fetchCustomFields();
  }, []);

  const fetchUsers = async () => {
    try {
      const userList = await getAllUsers();
      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setLoading(false);
    }
  };

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name
  }));

  // ------------------------------------------------------
  // FETCH CUSTOM FIELDS
  // ------------------------------------------------------
  const fetchCustomFields = async () => {
    try {
      const fields = await getAllCustomFields();
      setCustomFields(fields);

      const updated = {};
      fields.forEach((f) => {
        const found = leadData.custom_fields?.find(
          (c) => c.field_id === f.field_id
        );
        updated[f.field_id] = found?.field_value ?? "";
      });

      setFieldValues(updated);

      handleCustomFieldsUpdate(
        Object.entries(updated).map(([id, val]) => ({
          field_id: Number(id),
          field_value: val
        }))
      );
    } catch (err) {
      console.error("Error fetching custom fields:", err);
    }
  };

  // Sync custom fields when lead changes
  useEffect(() => {
    if (leadData && customFields.length > 0) {
      const updated = {};

      customFields.forEach((field) => {
        const existing = leadData.custom_fields?.find(
          (c) => c.field_id === field.field_id
        );

        updated[field.field_id] =
          existing?.field_value ??
          fieldValues[field.field_id] ??
          "";
      });

      setFieldValues(updated);

      handleCustomFieldsUpdate(
        Object.entries(updated).map(([id, val]) => ({
          field_id: Number(id),
          field_value: val
        }))
      );
    }
  }, [leadData, customFields]);

  // Custom field value change
  const handleFieldChange = (fieldId, value) => {
    const updated = {
      ...fieldValues,
      [fieldId]: value
    };

    setFieldValues(updated);

    handleCustomFieldsUpdate(
      Object.entries(updated).map(([id, val]) => ({
        field_id: Number(id),
        field_value: val
      }))
    );
  };

  // ------------------------------------------------------
  // Meetings Logic
  // ------------------------------------------------------
  const fetchMeetings = async () => {
    try {
      const data = await getMeetingsByLead(leadData.id);
      setMeetings(data);
    } catch (err) {
      console.error("Error fetching meetings:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "meetings" && leadData.id) {
      fetchMeetings();
    }
  }, [activeTab, leadData]);

  const handleMeetingChange = (e) => {
    const { name, value } = e.target;
    setMeetingDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMeeting = async (e) => {
    e.preventDefault();

    if (!meetingDetails.meeting_date || !meetingDetails.meeting_location)
      return alert("Date & location are required.");

    try {
      const newMeeting = await createMeeting({
        lead_id: leadData.id,
        ...meetingDetails
      });

      setMeetings((prev) => [...prev, newMeeting]);

      setMeetingDetails({
        meeting_date: "",
        meeting_location: "",
        meeting_notes: "",
      });

      setShowForm(false);

    } catch (err) {
      alert("Error adding meeting.");
    }
  };

  const handleSaveMeetings = async () => {
    try {
      await createMeeting(meetings);
      alert("Meetings saved.");
    } catch {
      alert("Error saving meetings.");
    }
  };

  // ------------------------------------------------------
  // RENDER UI (WITH ADDED GST FIELD)
  // ------------------------------------------------------
  return (
    <div className="el-layout">

      {/* TAB 1 — LEAD DETAILS */}
      {activeTab === "leadDetails" && (
        <div className="el-wrapper">
          <form className="edit-lead-form" onSubmit={handleSubmit}>
            <div className="detail-wrapper">

            <div className="el-buttons">

              {/* SAVE CHANGES */}
              <button
                type="submit"
                className="primary-btn"
                disabled={!isDirty}
                style={{ opacity: isDirty ? 1 : 0.5 }}
              >
                {isCreateMode ? "Create Lead" : "Save Changes"}

              </button>


              {/* ACTIONS DROPDOWN */}

                <button
                    onClick={(e) => {
                      e.preventDefault(); // optional but safe
                      setActionsAnchorEl(e.currentTarget);
                    }}
                  className="secondary-btn"
                >
             
                    <p>Actions</p>
                    <ArrowDropDownIcon />
              

                </button>
     



              <Menu
                anchorEl={actionsAnchorEl}
                open={actionsOpen}
                onClose={() => setActionsAnchorEl(null)}
              >
                <MenuItem
                  onClick={() => {
                    setActionsAnchorEl(null);
                    onSendQuotation();
                  }}
                >
                  <DescriptionOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                  Send Quotation
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setActionsAnchorEl(null);
                    sendEmailtoSp();
                  }}
                >
                  <EmailOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />
                  Send Email
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setActionsAnchorEl(null);
                    // 🔥 keep delete logic same as before (or wire later)
                    console.warn('Delete clicked');
                  }}
                  style={{ color: '#d32f2f' }}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />
                  Delete
                </MenuItem>
              </Menu>

            </div>



              <div className="detail-title"><h4>Contact Details</h4></div>

              <div className="detail-fields">
                <div className="detail-input-row">
                  <InputField label="First Name" type="text" id="first_name" name="first_name"
                    value={leadData.first_name} onChange={handleChange} />
                  <InputField label="Last Name" type="text" id="last_name" name="last_name"
                    value={leadData.last_name} onChange={handleChange} />
                </div>

                <div className="detail-input-row">
                  <InputField label="Email" type="email" id="email" name="email"
                    value={leadData.email} onChange={handleChange} />
                  <InputField label="Phone Number" type="tel" id="phone_number" name="phone_number"
                    value={leadData.phone_number} onChange={handleChange} />
                </div>

                {/* ✅ NEW GST FIELD HERE */}
                <div className="detail-input-row">
                  <InputField
                    label="GST Number"
                    type="text"
                    id="gst_number"
                    name="gst_number"
                    value={leadData.gst_number}
                    onChange={handleChange}
                  />
                </div>

              </div>
            </div>

            {/* LEAD DETAILS */}
            <div className="detail-wrapper">
              <div className="detail-title"><h4>Lead Details</h4></div>

              <div className="detail-fields">
                <div className="detail-input-row">
                  <InputField label="Company Name" type="text" id="company_name" name="company_name"
                    value={leadData.company_name} onChange={handleChange} />
                  <InputField label="Status" type="select" id="lead_status" name="lead_status"
                    value={leadData.lead_status} onChange={handleChange}
                    options={statusOptions.map((o) => ({ label: o, value: o }))} />
                </div>

                <div className="detail-input-row">
                  <InputField label="Contact Name" type="text" id="contact_name" name="contact_name"
                    value={leadData.contact_name} onChange={handleChange} />
                  <InputField label="Priority" type="select" id="priority" name="priority"
                    value={leadData.priority} onChange={handleChange}
                    options={priorityOptions.map((p) => ({ label: p, value: p }))} />
                </div>

                <div className="detail-input-row">
                  <InputField
                    label="Follow-Up Date"
                    type="datetime-local"
                    id="follow_up_date"
                    name="follow_up_date"
                    value={
                      leadData.follow_up_date
                        ? leadData.follow_up_date.includes("T")
                          ? leadData.follow_up_date
                          : leadData.follow_up_date + "T00:00"
                        : ""
                    }
                    onChange={handleChange}
                  />

                  <InputField label="Assigned Salesperson" type="select"
                    id="assigned_salesperson" name="assigned_salesperson"
                    value={leadData.assigned_salesperson}
                    onChange={handleChange}
                    options={userOptions} />
                </div>

                <div className="detail-input-row">
                  <InputField label="Hotness (1-5)" type="number" id="hotness" name="hotness"
                    value={leadData.hotness} onChange={handleChange} min="1" max="5" />
                  <InputField label="Amount" type="number" id="amount" name="amount"
                    value={leadData.amount} onChange={handleChange} step="0.01" />
                </div>

                <div className="detail-input-row">
                  <InputField label="Notes" type="textarea" id="notes" name="notes"
                    value={leadData.notes} onChange={handleChange} />
                  <InputField label="User" type="text" id="user" name="user"
                    value={leadData.user} disabled />
                </div>
              </div>
            </div>

            {/* CUSTOM FIELDS */}
            <div className="detail-wrapper">
              <div className="detail-title"><h4>Custom Fields</h4></div>

              <div className="detail-fields">
                {customFields.reduce((rows, field, index) => {
                  if (index % 2 === 0) rows.push([field]);
                  else rows[rows.length - 1].push(field);
                  return rows;
                }, []).map((row, idx) => (
                  <div className="detail-input-row" key={`row-${idx}`} style={{ display: 'flex', gap: '10px' }}>
                    {row.map((field) => (
                      <InputField
                        key={field.field_id}
                        label={field.field_name}
                        type={field.field_type}
                        id={`custom-field-${field.field_id}`}
                        name={`custom_field_${field.field_id}`}
                        value={fieldValues[field.field_id] ?? ""}
                        onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
                        options={(field.options || []).map((o) => ({ value: o, label: o }))}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>
      )}


    {activeTab === "activities" && (
      <ActivitiesTab leadId={leadData.id} />
    )}

    {activeTab === "notes" && (
      <NotesTab leadId={leadData.id} />
    )}

    {activeTab === "files" && (
      <FilesTab leadId={leadData.id} />
    )}


    </div>
  );
};

export default EditForm;

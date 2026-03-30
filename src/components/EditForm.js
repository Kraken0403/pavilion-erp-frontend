// src/components/EditForm.js
import React, { useState, useEffect, useCallback } from 'react';
import '../assets/styles/EditForm.scss';
import { getMeetingsByLead } from '../services/meetingService';
import { getAllCustomFields } from '../services/customFieldServices';
import { getAllUsers } from '../services/userServices';
import ActivitiesTab from "./leads/ActivitiesTab";
import NotesTab from "./leads/NotesTab";
import FilesTab from "./leads/FilesTab";
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { toInputDateTimeValue } from '../utils/dateFormatter';
import { useSettings } from '../context/SettingsContext';
import { formatStatusLabel } from '../utils/statusFormatter';

import {
  Menu,
  MenuItem
} from '@mui/material'
import TimePicker12 from './TimePicker12'
import ChannelSelectModal from './ui/ChannelSelectModal';

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi"
];

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
      {type === 'time' ? (
        <TimePicker12
          value={value ?? ''}
          onChange={(val) => onChange({ target: { name, value: val } })}
        />
      ) : (
        <input
          type={type}
          id={id}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      )}
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
  sendWhatsApptoSp,
  handleSubmit,
  activeTab,
  customFields: initialCustomFields,
  handleCustomFieldsUpdate,
  onSendQuotation
}) => {

  const { settings } = useSettings();
  const isCateringBusiness = String(settings?.business_type || '').toUpperCase() === 'CATERING';

  const isCreateMode = !leadData?.id;

  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const actionsOpen = Boolean(actionsAnchorEl);
  const [channelModalOpen, setChannelModalOpen] = useState(false);

  // Dirty check
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const isDirty = isCreateMode
    ? true
    : initialSnapshot
      ? JSON.stringify(leadData) !== JSON.stringify(initialSnapshot)
      : false;


  const [users, setUsers] = useState([]);
  const [, setLoading] = useState(true);

  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});

  const [, setMeetings] = useState([]);

  const priorityOptions = ["low", "medium", "high"];
  const statusOptions = ["new", "in-progress", "closed", "won", "lost"];

  const fetchUsers = useCallback(async () => {
    try {
      const userList = await getAllUsers();
      setUsers(userList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setLoading(false);
    }
  }, []);

  const fetchCustomFields = useCallback(async () => {
    try {
      const fields = await getAllCustomFields();
      setCustomFields(fields);
    } catch (err) {
      console.error("Error fetching custom fields:", err);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const data = await getMeetingsByLead(leadData.id);
      setMeetings(data);
    } catch (err) {
      console.error("Error fetching meetings:", err);
    }
  }, [leadData.id]);

  useEffect(() => {
    if (!initialSnapshot && leadData?.id) {
      setInitialSnapshot(JSON.parse(JSON.stringify(leadData)));
    }
  }, [initialSnapshot, leadData]);
  // ------------------------------------------------------
  // Fetch Users & Custom Fields
  // ------------------------------------------------------
  useEffect(() => {
    fetchUsers();
    fetchCustomFields();
  }, [fetchUsers, fetchCustomFields]);

  useEffect(() => {
    if (sameAsBilling) {
      handleChange({
        target: { name: "shipping_address", value: leadData.billing_address }
      });
      handleChange({
        target: { name: "shipping_landmark", value: leadData.billing_landmark }
      });
      handleChange({
        target: { name: "shipping_city", value: leadData.billing_city }
      });
      handleChange({
        target: { name: "shipping_state", value: leadData.billing_state }
      });
      handleChange({
        target: { name: "shipping_pincode", value: leadData.billing_pincode }
      });
    }
  }, [
    sameAsBilling,
    handleChange,
    leadData.billing_address,
    leadData.billing_landmark,
    leadData.billing_city,
    leadData.billing_state,
    leadData.billing_pincode
  ]);

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name
  }));

  // Sync custom fields when lead changes
  useEffect(() => {
    if (leadData && customFields.length > 0) {
      setFieldValues((prev) => {
        const updated = {};

        customFields.forEach((field) => {
          const existing = leadData.custom_fields?.find(
            (c) => c.field_id === field.field_id
          );

          updated[field.field_id] =
            existing?.field_value ??
            prev[field.field_id] ??
            "";
        });

        return updated;
      });
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

  useEffect(() => {
    if (activeTab === "meetings" && leadData.id) {
      fetchMeetings();
    }
  }, [activeTab, leadData.id, fetchMeetings]);

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
                      setChannelModalOpen(true);
                    }}
                  >
                    <NotificationsActiveOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />
                    Send Notification
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

                <ChannelSelectModal
                  open={channelModalOpen}
                  onClose={() => setChannelModalOpen(false)}
                  title="Send Lead Notification"
                  subtitle="Choose channels to notify assigned salesperson"
                  defaultEmail
                  defaultWhatsApp
                  confirmLabel="Send Notification"
                  onConfirm={async ({ sendEmail = true, sendWhatsApp = false }) => {
                    setChannelModalOpen(false);
                    if (sendEmail) {
                      await sendEmailtoSp?.();
                    }
                    if (sendWhatsApp) {
                      await sendWhatsApptoSp?.();
                    }
                  }}
                />

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
                <div className="detail-input-row">
                  <InputField
                    label="Source"
                    type="text"
                    id="source"
                    name="source"
                    value={leadData.source}
                    disabled
                  />
                  <InputField
                    label="GST Number"
                    type="text"
                    id="gst_number"
                    name="gst_number"
                    value={leadData.gst_number}
                    onChange={handleChange}
                  />
                </div>

                {isCateringBusiness && (
                  <>
                    <div className="detail-input-row">
                      <InputField
                        label="Event Type"
                        type="text"
                        id="event_type"
                        name="event_type"
                        value={leadData.event_type}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Event Date"
                        type="date"
                        id="event_date"
                        name="event_date"
                        value={leadData.event_date}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="detail-input-row">
                      <InputField
                        label="Event Time"
                        type="time"
                        id="event_time"
                        name="event_time"
                        value={leadData.event_time}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Event Location"
                        type="text"
                        id="event_location"
                        name="event_location"
                        value={leadData.event_location}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="detail-input-row">
                      <InputField
                        label="PAX"
                        type="number"
                        id="pax"
                        name="pax"
                        value={leadData.pax}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Product Name"
                        type="text"
                        id="product_name"
                        name="product_name"
                        value={leadData.product_name}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}


              </div>
            </div>

            {/* BILLING ADDRESS */}
            <div className="detail-wrapper">
              <div className="detail-title"><h4>Billing Address</h4></div>

              <div className="detail-fields">
                <div className="detail-input-row">
                  <InputField
                    label="Address"
                    type="textarea"
                    id="billing_address"
                    name="billing_address"
                    value={leadData.billing_address}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Landmark"
                    type="text"
                    id="billing_landmark"
                    name="billing_landmark"
                    value={leadData.billing_landmark}
                    onChange={handleChange}
                  />
                </div>

                <div className="detail-input-row">
                  <InputField
                    label="City"
                    type="text"
                    id="billing_city"
                    name="billing_city"
                    value={leadData.billing_city}
                    onChange={handleChange}
                  />

                  <InputField
                    label="State"
                    type="select"
                    id="billing_state"
                    name="billing_state"
                    value={leadData.billing_state}
                    onChange={handleChange}
                    options={indianStates.map(s => ({ label: s, value: s }))}
                  />
                </div>

                <div className="detail-input-row">
                  <InputField
                    label="Pincode"
                    type="text"
                    id="billing_pincode"
                    name="billing_pincode"
                    value={leadData.billing_pincode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* SHIPPING ADDRESS */}
            <div className="detail-wrapper">
              <div className="detail-title">
                <h4>Shipping Address</h4>

                <label style={{ fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => setSameAsBilling(e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Same as Billing
                </label>
              </div>

              <div className="detail-fields">
                <div className="detail-input-row">
                  <InputField
                    label="Address"
                    type="textarea"
                    id="shipping_address"
                    name="shipping_address"
                    value={leadData.shipping_address}
                    onChange={handleChange}
                    disabled={sameAsBilling}
                  />
                  <InputField
                    label="Landmark"
                    type="text"
                    id="shipping_landmark"
                    name="shipping_landmark"
                    value={leadData.shipping_landmark}
                    onChange={handleChange}
                    disabled={sameAsBilling}
                  />
                </div>

                <div className="detail-input-row">
                  <InputField
                    label="City"
                    type="text"
                    id="shipping_city"
                    name="shipping_city"
                    value={leadData.shipping_city}
                    onChange={handleChange}
                    disabled={sameAsBilling}
                  />

                  <InputField
                    label="State"
                    type="select"
                    id="shipping_state"
                    name="shipping_state"
                    value={leadData.shipping_state}
                    onChange={handleChange}
                    disabled={sameAsBilling}
                    options={indianStates.map(s => ({ label: s, value: s }))}
                  />
                </div>

                <div className="detail-input-row">
                  <InputField
                    label="Pincode"
                    type="text"
                    id="shipping_pincode"
                    name="shipping_pincode"
                    value={leadData.shipping_pincode}
                    onChange={handleChange}
                    disabled={sameAsBilling}
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
                    options={statusOptions.map((o) => ({ label: formatStatusLabel(o), value: o }))} />
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
                    value={toInputDateTimeValue(leadData.follow_up_date)}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    addLead,
    updateLead,
    getLeadById
} from '../services/leadService';   // ✔ FIXED — correct imports

import { getUserById } from '../services/userServices';
import { sendEmail } from '../services/spEmailServices';


const useLeadForm = (initialLeadData, isEdit = false, leadId = null) => {
    const navigate = useNavigate();

    // main form data
    const [leadData, setLeadData] = useState(initialLeadData);

    // [{ field_id, field_value }]
    const [customFields, setCustomFields] = useState([]);

    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    const [activeTab, setActiveTab] = useState('leadDetails');


    // ─────────────────────────────────────────────
    // LOAD LEAD DATA ON EDIT
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!isEdit || !leadId) return;

        const loadLeadData = async () => {
            try {
                const lead = await getLeadById(leadId);

                // set main fields
                setLeadData(prev => ({
                    ...prev,
                    ...lead,
                    custom_fields: lead.custom_fields || []
                }));

                // convert custom fields from db → correct frontend format
                if (lead.custom_fields?.length) {
                    setCustomFields(
                        lead.custom_fields.map(cf => ({
                            field_id: cf.field_id,
                            field_value: cf.field_value || ""
                        }))
                    );
                } else {
                    setCustomFields([]);
                }

            } catch (err) {
                console.error("❌ Error loading lead:", err);
            }
        };

        loadLeadData();
    }, [isEdit, leadId]);


    // ─────────────────────────────────────────────
    // GENERAL FIELD CHANGE HANDLER
    // ─────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;

        setLeadData(prev => ({
            ...prev,
            [name]: value,
        }));
    };


    // ─────────────────────────────────────────────
    // CUSTOM FIELD HANDLER (ALREADY IN CORRECT FORMAT)
    // ─────────────────────────────────────────────
    const handleCustomFieldsUpdate = (fields) => {
        setCustomFields(fields);
    };


    // ─────────────────────────────────────────────
    // SEND EMAIL TO ASSIGNED SALESPERSON
    // ─────────────────────────────────────────────
    const sendEmailtoSp = async () => {
        try {
            const sp = await getUserById(leadData.assigned_salesperson);

            if (!sp?.email) {
                throw new Error("Assigned salesperson has no email.");
            }

            const payload = {
                ...leadData,
                custom_fields: customFields,
                salesperson_email: sp.email
            };

            await sendEmail(payload);

            setNotification({
                open: true,
                message: 'Email sent successfully!',
                severity: 'success',
            });

        } catch (err) {
            console.error("❌ Email sending failed:", err);
            setNotification({
                open: true,
                message: err.message || "Failed to send email.",
                severity: "error",
            });
        }
    };


    // ─────────────────────────────────────────────
    // CREATE / UPDATE LEAD
    // ─────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                ...leadData,
                custom_fields: customFields  // ALWAYS correct format
            };

            if (isEdit) {
                await updateLead(leadId, payload);

                setNotification({
                    open: true,
                    message: 'Lead updated successfully!',
                    severity: 'success',
                });

            } else {
                await addLead(payload);

                setNotification({
                    open: true,
                    message: 'Lead added successfully!',
                    severity: 'success',
                });
            }

            navigate('/leads');

        } catch (err) {
            console.error("❌ Error saving lead:", err);
            setNotification({
                open: true,
                message:
                    err.message ||
                    (isEdit ? "Failed to update lead." : "Failed to add lead."),
                severity: "error",
            });
        }
    };


    // ─────────────────────────────────────────────
    // CLOSE NOTIFICATION
    // ─────────────────────────────────────────────
    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };


    return {
        leadData,
        setLeadData,

        customFields,
        setCustomFields,
        handleCustomFieldsUpdate,

        notification,
        handleCloseNotification,

        activeTab,
        setActiveTab,

        handleChange,
        handleSubmit,
        sendEmailtoSp
    };
};

export default useLeadForm;

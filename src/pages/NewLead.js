import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import Topbar from '../components/Topbar';
import EditForm from '../components/EditForm';
import useLeadForm from '../hooks/useLeadForm';

const NewLead = () => {
    const initialLeadData = {
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        company_name: '',
        lead_status: 'new',
        contact_name: '',
        priority: 'medium',
        follow_up_date: '',
        assigned_salesperson: '',
        hotness: 1,
        amount: 0,
        notes: '',
        gst_number: '', 
        user: 'default_user', 
    };

    const {
        leadData,
        customFields,
        notification,
        activeTab,
        handleChange,
        handleCustomFieldsUpdate,
        handleSubmit,
        handleCloseNotification,
        setActiveTab,
        sendEmailtoSp
    } = useLeadForm(initialLeadData);

    return (
        <>
            <Topbar />
            <div className="leads-table-container lead-form-page">
                <div className="module-card lead-form-card">
                <EditForm
                    leadData={leadData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    customFields={customFields}
                    handleCustomFieldsUpdate={handleCustomFieldsUpdate}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    sendEmailtoSp={sendEmailtoSp}
                />
                </div>
            </div>
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                    variant="filled"
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default NewLead;

// src/pages/EditLead.js
import React from 'react';
import { useParams } from 'react-router-dom';

import Topbar from '../components/Topbar';
import EditForm from '../components/EditForm';
import EditTabs from '../components/EditTabs';
import { useNavigate } from 'react-router-dom';
import useLeadForm from '../hooks/useLeadForm';

const EditLead = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleSendQuotation = () => {
    navigate(`/quotation/create/${id}`);
  };

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
    user: 'default_user',
    custom_fields: []
  };

  const {
    leadData,
    customFields,
    activeTab,
    handleChange,
    handleCustomFieldsUpdate,
    handleSubmit,
    setActiveTab,
    sendEmailtoSp,
    sendWhatsApptoSp
  } = useLeadForm(initialLeadData, true, id);

  const tabs = [
    { key: "leadDetails", label: "Details" },
    { key: "activities", label: "Activities" },
    { key: "notes", label: "Notes" },
    { key: "files", label: "Files" }
  ];

  return (
    <>
      <Topbar />

      <EditTabs
        title={leadData.first_name}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        leadData={leadData}
        tabs={tabs}
      />

      <EditForm
        leadData={leadData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        customFields={customFields}
        handleCustomFieldsUpdate={handleCustomFieldsUpdate}
        activeTab={activeTab}
        sendEmailtoSp={sendEmailtoSp}
        sendWhatsApptoSp={sendWhatsApptoSp}
        onSendQuotation={handleSendQuotation}
      />
    </>
  );
};

export default EditLead;

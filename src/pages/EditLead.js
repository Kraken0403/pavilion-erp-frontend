// src/pages/EditLead.js
import React from 'react';
import { useParams } from 'react-router-dom';

import Topbar from '../components/Topbar';
import EditForm from '../components/EditForm';
import EditTabs from '../components/EditTabs';
import { useNavigate } from 'react-router-dom';
import useLeadForm from '../hooks/useLeadForm';

const EditLead = ({ leadId, onSaved }) => {
  const { id: routeId } = useParams();
  const id = leadId || routeId;
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
        company_id: '',
        designation: '',
    lead_status: 'new',
    contact_name: '',
    priority: 'medium',
    follow_up_date: '',
    assigned_salesperson: '',
    hotness: 1,
    amount: 0,
    notes: '',
        source: 'CRM',
        billing_address: '', billing_city: '', billing_state: '', billing_pincode: '',
        shipping_address: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
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
  } = useLeadForm(initialLeadData, true, id, onSaved);

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
      />
    </>
  );
};

export default EditLead;

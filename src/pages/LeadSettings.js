import React, { useState } from 'react';
import EditTabs from '../components/EditTabs';
import CreateCustomFields from '../components/customFields/createCustomFields';
import FieldSelector from '../components/FieldSelector';
import Topbar from '../components/Topbar';

function LeadSettings() {
  const [activeTab, setActiveTab] = useState('fieldSelector');

  const tabs = [
    { key: 'fieldSelector', label: 'Lead Fields' },
    { key: 'customFields', label: 'Custom Fields' },
  ];

  return (
    <div className="lead-settings">
      <Topbar />
      <EditTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        title="Lead Settings"
      />
      <div className="tab-content">
        {activeTab === 'fieldSelector' && (
          <FieldSelector onUpdateTable={(fields) => console.log(fields)} />
        )}
        {activeTab === 'customFields' && <CreateCustomFields />}
      </div>
    </div>
  );
}

export default LeadSettings;

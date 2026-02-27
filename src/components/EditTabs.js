import React from 'react';
import '../assets/styles/EditTabs.scss';

const EditTabs = ({ activeTab, setActiveTab, tabs, leadData, title }) => {
  return (
    <div className="tabs-wrapper">
      <div className="tabs-action-btns">
        <p>Lead Name: {title}</p>
        <div className="next-btn">
          {/* Optional action button or leave empty */}
        </div>
      </div>
      <div className="tabs-main">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active-tab" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EditTabs;

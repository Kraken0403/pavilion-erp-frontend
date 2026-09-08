import React from 'react';

export default function RecordFinancialSummary({ items = [] }) {
  const visibleItems = items.filter((item) => item && item.hidden !== true);

  return (
    <div className="record-financial-summary" role="group" aria-label="Financial summary">
      {visibleItems.map((item, index) => (
        <div
          key={item.key || item.label}
          className={`record-financial-summary__item ${item.tone ? `is-${item.tone}` : ''} ${index === visibleItems.length - 1 ? 'is-total' : ''}`}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.subvalue ? <small>{item.subvalue}</small> : null}
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function DetailBackLink({ to, label }) {
  return <Link className="erp-detail-back-link" to={to}>← {label}</Link>;
}

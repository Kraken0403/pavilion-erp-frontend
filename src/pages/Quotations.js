import React, { useEffect, useState } from 'react';
import QuotationsTable from '../components/quotation/QuotationTable';
import { fetchQuotations } from '../services/quotationService';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import Topbar from '../components/Topbar';

function Quotations() {
  /* ---------------- DATA ---------------- */
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FILTER STATE ---------------- */
  const [searchQuery, setSearchQuery] = useState('');
  const [sortValue, setSortValue] = useState('latest');
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null
  });

  /* ---------------- NOTIFICATIONS ---------------- */
  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  /* ---------------- FETCH ---------------- */
  const loadQuotations = async () => {
    try {
      setLoading(true);
      const data = await fetchQuotations();
      setQuotations(data);
    } catch (err) {
      console.error(err);
      showNotification('❌ Failed to load quotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  /* ---------------- RENDER ---------------- */
  if (loading) {
    return <div style={{ padding: 20 }}>Loading quotations…</div>;
  }

  return (
    <>
      <Topbar />
      <QuotationsTable
        quotations={quotations}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortValue={sortValue}
        setSortValue={setSortValue}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        reload={loadQuotations}
      />

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </>
  );
}

export default Quotations;

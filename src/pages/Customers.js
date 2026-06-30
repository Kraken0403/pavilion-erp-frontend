import React, { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "../components/Topbar";
import "../assets/styles/LeadsTable.scss";
import PageLoader from "../components/ui/PageLoader";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";
import CustomersTable from "../components/CustomersTable";
import AddCustomerForm from "../components/AddCustomerForm";
import { getAllCustomers } from "../services/customerService";
import useAutoRefresh from "../hooks/useAutoRefresh";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const showNotification = useCallback((message, severity = "success") => {
    setNotification({ open: true, message, severity });
  }, []);

  const getCustomersSignature = useCallback((items) => {
    if (!Array.isArray(items)) return "[]";

    return JSON.stringify(
      items.map((c) => ({
        name: String(c?.customer_name || ""),
        email: String(c?.customer_email || ""),
        phone: String(c?.customer_phone || ""),
        total_invoices: Number(c?.total_invoices || 0),
        total_spent: Number(c?.total_spent || 0),
      })),
    );
  }, []);

  // visibleFields not required for report-driven customers list

  const getCustomers = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent && !hasLoadedOnceRef.current) {
        setLoading(true);
      }

      try {
        const resp = await getAllCustomers();
        const rows = Array.isArray(resp?.data) ? resp.data : [];

        setCustomers((prev) => {
          const prevSignature = getCustomersSignature(prev);
          const nextSignature = getCustomersSignature(rows);
          return prevSignature === nextSignature ? prev : rows;
        });
      } catch (error) {
        console.error(error);
        showNotification("Failed to load customers", "error");
      } finally {
        if (!hasLoadedOnceRef.current) {
          setLoading(false);
          hasLoadedOnceRef.current = true;
        }
      }
    },
    [getCustomersSignature, showNotification],
  );

  useEffect(() => {
    getCustomers({ silent: false });
  }, [getCustomers]);

  const handleAutoRefresh = useCallback(() => {
    return getCustomers({ silent: true });
  }, [getCustomers]);

  useAutoRefresh(handleAutoRefresh, { intervalMs: 20000 });

  const handleCloseNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  const handleAddCustomerSuccess = () => {
    showNotification("Customer created successfully", "success");
    // Refresh customers list
    getCustomers({ silent: false });
  };

  return (
    <>
      <Topbar />

      <div className="leads-container leads-page">
        {loading ? (
          <PageLoader message="Loading customers..." minHeight={260} />
        ) : (
          <CustomersTable
            customers={customers}
            onAddCustomer={() => setAddCustomerOpen(true)}
          />
        )}

        <NotificationSnackbar
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          onClose={handleCloseNotification}
        />

        <AddCustomerForm
          open={addCustomerOpen}
          onClose={() => setAddCustomerOpen(false)}
          onSuccess={handleAddCustomerSuccess}
        />
      </div>
    </>
  );
};

export default Customers;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeads } from '../services/leadService';
import LeadsTable from '../components/LeadsTable';
import Topbar from '../components/Topbar';
import PageLoader from '../components/ui/PageLoader';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import { getFieldOrder } from '../services/leadFieldService';
import { useSettings } from '../context/SettingsContext';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Customers = () => {
    const { settings } = useSettings();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const hasLoadedOnceRef = useRef(false);

    const showNotification = useCallback((message, severity = 'success') => {
        setNotification({ open: true, message, severity });
    }, []);

    const getCustomersSignature = useCallback((items) => {
        if (!Array.isArray(items)) return '[]';

        return JSON.stringify(
            items.map((item) => ({
                id: Number(item?.id || 0),
                updated_at: String(item?.updated_at || ''),
                email: String(item?.email || ''),
                first_name: String(item?.first_name || ''),
                last_name: String(item?.last_name || ''),
            }))
        );
    }, []);

    const [visibleFields, setVisibleFields] = useState([]);

    const fetchFieldOrder = useCallback(async () => {
        try {
            const response = await getFieldOrder();
            setVisibleFields(response.fieldOrder || []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchFieldOrder();
    }, [fetchFieldOrder]);

    const getCustomers = useCallback(async ({ silent = false } = {}) => {
        if (!silent && !hasLoadedOnceRef.current) {
            setLoading(true);
        }

        try {
            const response = await fetchLeads();
            const nextLeads = Array.isArray(response?.leads) ? response.leads : [];

            // Only website customers
            const websiteLeads = nextLeads.filter(l => {
                const src = String(l?.source || '').toLowerCase();
                return src.includes('website') || src.includes('web');
            });

            setCustomers((prev) => {
                const prevSignature = getCustomersSignature(prev);
                const nextSignature = getCustomersSignature(websiteLeads);
                return prevSignature === nextSignature ? prev : websiteLeads;
            });
        } catch (error) {
            console.error(error);
            showNotification('Failed to load customers', 'error');
        } finally {
            if (!hasLoadedOnceRef.current) {
                setLoading(false);
                hasLoadedOnceRef.current = true;
            }
        }
    }, [getCustomersSignature, showNotification]);

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

    return (
        <>
            <Topbar />

            <div className="leads-container leads-page">
                {loading ? (
                    <PageLoader message="Loading customers..." minHeight={260} />
                ) : (
                    <LeadsTable
                        leads={customers}
                        visibleFields={visibleFields}
                        // reuse existing table actions where applicable
                    />
                )}

                <NotificationSnackbar
                    open={notification.open}
                    message={notification.message}
                    severity={notification.severity}
                    onClose={handleCloseNotification}
                />
            </div>
        </>
    );
};

export default Customers;

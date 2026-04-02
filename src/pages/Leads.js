import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeads, deleteLead, updateLead, bulkDeleteLeads, bulkImportLeads } from '../services/leadService';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import LeadsTable from '../components/LeadsTable';
import Topbar from '../components/Topbar';
import PageLoader from '../components/ui/PageLoader';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import { getFieldOrder } from '../services/leadFieldService';
import { useSettings } from '../context/SettingsContext';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Leads = () => {
    const { settings } = useSettings();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const [open, setOpen] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const fileInputRef = useRef(null);
    const hasLoadedOnceRef = useRef(false);

    const showNotification = useCallback((message, severity = 'success') => {
        setNotification({ open: true, message, severity });
    }, []);

    const handleCloseNotification = useCallback(() => {
        setNotification((prev) => ({ ...prev, open: false }));
    }, []);

    const getLeadsSignature = useCallback((items) => {
        if (!Array.isArray(items)) return '[]';

        return JSON.stringify(
            items.map((item) => ({
                id: Number(item?.id || 0),
                updated_at: String(item?.updated_at || ''),
                status: String(item?.status || ''),
                priority: String(item?.priority || ''),
                first_name: String(item?.first_name || ''),
                last_name: String(item?.last_name || ''),
                company: String(item?.company || ''),
            }))
        );
    }, []);

    const leadStatusOptions = ['new', 'in-progress', 'closed', 'won', 'lost'];
    const priorityOptions = ['low', 'medium', 'high'];
    const [visibleFields, setVisibleFields] = useState([]);

    // ✅ FILTER STATE MOVED HERE
    const [searchQuery, setSearchQuery] = useState('');
    const [sortValue, setSortValue] = useState('latest');
    const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

    const isGeneralBusiness = String(settings?.business_type || 'GENERAL').toUpperCase() === 'GENERAL';
    const eventFields = ['event_name', 'event_type', 'event_date', 'event_time', 'event_location', 'venue'];
    const filteredVisibleFields = isGeneralBusiness
        ? visibleFields.filter((field) => !eventFields.includes(String(field || '').toLowerCase()))
        : visibleFields;

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

    const getLeads = useCallback(async ({ silent = false } = {}) => {
        if (!silent && !hasLoadedOnceRef.current) {
            setLoading(true);
        }

        try {
            const response = await fetchLeads();
            const nextLeads = Array.isArray(response?.leads) ? response.leads : [];

            setLeads((prev) => {
                const prevSignature = getLeadsSignature(prev);
                const nextSignature = getLeadsSignature(nextLeads);
                return prevSignature === nextSignature ? prev : nextLeads;
            });
        } catch (error) {
            console.error(error);
        } finally {
            if (!hasLoadedOnceRef.current) {
                setLoading(false);
                hasLoadedOnceRef.current = true;
            }
        }
    }, [getLeadsSignature]);

    useEffect(() => {
        getLeads({ silent: false });
    }, [getLeads]);

    const handleLeadsAutoRefresh = useCallback(() => {
        return getLeads({ silent: true });
    }, [getLeads]);

    useAutoRefresh(handleLeadsAutoRefresh, { intervalMs: 20000 });

    const handleDeleteConfirmation = (id) => {
        setDeleteId(id);
        setOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteLead(deleteId);
            await getLeads();
            showNotification('Lead deleted successfully', 'success');
        } catch (error) {
            console.error(error);
            showNotification(error?.response?.data?.error || 'Failed to delete lead', 'error');
        } finally {
            setOpen(false);
        }
    };

    const handleBulkDelete = async (leadIds = []) => {
        const ids = Array.isArray(leadIds) ? leadIds : [];
        if (!ids.length) return;

        try {
            const result = await bulkDeleteLeads(ids);
            await getLeads();

            const deletedCount = Number(result?.deleted_count || 0);
            const notFoundIds = Array.isArray(result?.not_found_ids) ? result.not_found_ids : [];

            if (deletedCount > 0) {
                const baseMessage = `${deletedCount} lead${deletedCount === 1 ? '' : 's'} deleted successfully`;
                const message = notFoundIds.length
                    ? `${baseMessage}. Not found: ${notFoundIds.join(', ')}`
                    : baseMessage;

                showNotification(message, notFoundIds.length ? 'warning' : 'success');
            } else {
                showNotification('No leads were deleted', 'warning');
            }
        } catch (error) {
            console.error(error);
            showNotification(error?.response?.data?.error || 'Failed to delete selected leads', 'error');
            throw error;
        }
    };

    const triggerBulkImport = () => {
        fileInputRef.current?.click();
    };

    const handleBulkFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        try {
            const result = await bulkImportLeads(file);
            await getLeads();

            if (result?.failed > 0) {
                showNotification(`⚠️ Imported ${result.success}/${result.total} leads. ${result.failed} failed.`, 'warning');
                console.table(result.errors || []);
            } else {
                showNotification(`✅ Successfully imported ${result.success} leads`, 'success');
            }
        } catch (err) {
            console.error('Bulk import failed', err);
            showNotification('❌ Bulk import failed', 'error');
        }
    };

    const handleUpdateLead = async (updatedLead) => {
        try {
            await updateLead(updatedLead.id, updatedLead);
            await getLeads(); // 👈 refetch is fine now
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <>
            <Topbar />

            <div className="leads-container leads-page">
                {/* Hidden file input for bulk import */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.csv"
                    style={{ display: 'none' }}
                    onChange={handleBulkFileChange}
                />

                {/* Import is triggered from the UtilsBar inside LeadsTable via onImportBulk prop */}
                {loading ? (
                    <PageLoader message="Loading leads..." minHeight={260} />
                ) : (
                    <LeadsTable
                        leads={leads}
                        visibleFields={filteredVisibleFields}
                        onDelete={handleDeleteConfirmation}
                        onBulkDelete={handleBulkDelete}
                        leadStatusOptions={leadStatusOptions}
                        priorityOptions={priorityOptions}
                        onUpdateLead={handleUpdateLead}

                        // ✅ PASS FILTER STATE
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        sortValue={sortValue}
                        setSortValue={setSortValue}
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                        onImportBulk={triggerBulkImport}
                    />
                )}

                <Dialog open={open} onClose={() => setOpen(false)}>
                    <DialogTitle>Delete Lead</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete this lead?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpen(false)}>No</Button>
                        <Button onClick={handleDelete} autoFocus>Yes</Button>
                    </DialogActions>
                </Dialog>

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

export default Leads;

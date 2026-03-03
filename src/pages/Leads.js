import React, { useEffect, useState } from 'react';
import { fetchLeads, deleteLead, updateLead } from '../services/leadService';
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import LeadsTable from '../components/LeadsTable';
import Topbar from '../components/Topbar';
import { getFieldOrder } from '../services/leadFieldService';
import { useSettings } from '../context/SettingsContext';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Leads = () => {
    const { settings } = useSettings();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const [open, setOpen] = useState(false);

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

    useEffect(() => {
        fetchFieldOrder();
    }, []);

    const fetchFieldOrder = async () => {
        try {
            const response = await getFieldOrder();
            setVisibleFields(response.fieldOrder || []);
        } catch (error) {
            console.error(error);
        }
    };

    const getLeads = async () => {
        setLoading(true);
        try {
            const response = await fetchLeads();
            setLeads(response.leads);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(getLeads, { intervalMs: 20000 });

    const handleDeleteConfirmation = (id) => {
        setDeleteId(id);
        setOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteLead(deleteId);
            await getLeads();
        } catch (error) {
            console.error(error);
        } finally {
            setOpen(false);
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
                {loading ? (
                    <CircularProgress />
                ) : (
                    <LeadsTable
                        leads={leads}
                        visibleFields={filteredVisibleFields}
                        onDelete={handleDeleteConfirmation}
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
            </div>
        </>
    );
};

export default Leads;

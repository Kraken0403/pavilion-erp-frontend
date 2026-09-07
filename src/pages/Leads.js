import React, { useEffect, useState } from 'react';
import { fetchLeads, deleteLead, updateLead } from '../services/leadService';
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import LeadsTable from '../components/LeadsTable';
import Topbar from '../components/Topbar';
import { getFieldOrder } from '../services/leadFieldService';
import EntityFormDrawer from '../components/ui/EntityFormDrawer';
import NewLead from './NewLead';
import EditLead from './EditLead';
import { useLocation, useNavigate } from 'react-router-dom';

const Leads = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState(null);

    const leadStatusOptions = ['new', 'in-progress', 'closed', 'won', 'lost'];
    const priorityOptions = ['low', 'medium', 'high'];
    const [visibleFields, setVisibleFields] = useState([]);

    // ✅ FILTER STATE MOVED HERE
    const [searchQuery, setSearchQuery] = useState('');
    const [sortValue, setSortValue] = useState('latest');
    const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        getLeads();
        fetchFieldOrder();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('create') === '1') setCreateOpen(true);
        if (params.get('edit')) setEditingLeadId(params.get('edit'));
    }, [location.search]);

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

    const closeCreate = () => {
        setCreateOpen(false);
        if (new URLSearchParams(location.search).has('create')) navigate('/leads', { replace: true });
    };

    const closeEdit = () => {
        setEditingLeadId(null);
        if (new URLSearchParams(location.search).has('edit')) navigate('/leads', { replace: true });
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
                        visibleFields={visibleFields}
                        onDelete={handleDeleteConfirmation}
                        leadStatusOptions={leadStatusOptions}
                        priorityOptions={priorityOptions}
                        onUpdateLead={handleUpdateLead}
                        onCreate={() => setCreateOpen(true)}
                        onRowOpen={(lead) => navigate(`/leads/${lead.id}`)}

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
                    <DialogTitle>Delete contact</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete this contact?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpen(false)}>No</Button>
                        <Button onClick={handleDelete} autoFocus>Yes</Button>
                    </DialogActions>
                </Dialog>
                <EntityFormDrawer open={createOpen} title="Create contact" onClose={closeCreate}>
                    <NewLead onSaved={() => { closeCreate(); getLeads(); }} />
                </EntityFormDrawer>
                <EntityFormDrawer open={Boolean(editingLeadId)} title="Edit contact" onClose={closeEdit}>
                    {editingLeadId && <EditLead leadId={editingLeadId} onSaved={() => { closeEdit(); getLeads(); }} />}
                </EntityFormDrawer>
            </div>
        </>
    );
};

export default Leads;

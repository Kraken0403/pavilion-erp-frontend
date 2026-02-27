import React, { useEffect, useState } from 'react';
import { fetchLeads, deleteLead, addLead, updateLead } from '../services/leadService';
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import LeadsTable from '../components/LeadsTable';
import Topbar from '../components/Topbar';
import { getFieldOrder } from '../services/leadFieldService';

const Leads = () => {
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

    useEffect(() => {
        getLeads();
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
                        visibleFields={visibleFields}
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

import React, { useState } from 'react';
import { TextField, MenuItem, Button, Grid, Box, Tab, Tabs } from '@mui/material';
import { addLead } from '../services/leadService';  // Assuming the API call
import EditTabs from './EditTabs';  // Assuming EditTabs handles Tab components
import WgiymEditor from './ui/WgiymEditor';

const LeadForm = ({ onAddSuccess, onAddFailure }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [leadData, setLeadData] = useState({
        first_name: '',
        last_name: '',
        company_name: '',
        lead_status: 'new',
        email: '',
        phone_number: '',
        contact_name: '',
        follow_up_date: '',
        priority: 'low',
        assigned_salesperson: '',
        hotness: '',
        amount: '',
        notes: ''
    });

    const handleChange = (e) => {
        setLeadData({ ...leadData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addLead(leadData);
            onAddSuccess(); // Show success notification
            setLeadData({ // Reset form fields
                first_name: '',
                last_name: '',
                company_name: '',
                lead_status: 'new',
                email: '',
                phone_number: '',
                contact_name: '',
                follow_up_date: '',
                priority: 'low',
                assigned_salesperson: '',
                hotness: '',
                amount: '',
                notes: ''
            });
        } catch (error) {
            onAddFailure(error.message || 'An error occurred'); // Show error notification
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Box sx={{ width: '100%' }}>
                <Tabs
                    value={activeTab}
                    onChange={(event, newValue) => setActiveTab(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab label="Lead Details" />
                    <Tab label="Additional Details" />
                    <Tab label="Status & Priority" />
                    <Tab label="Notes" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 && (
                <Grid container spacing={2} sx={{ marginTop: '1rem' }}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="First Name"
                            name="first_name"
                            value={leadData.first_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Last Name"
                            name="last_name"
                            value={leadData.last_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Email"
                            name="email"
                            value={leadData.email}
                            onChange={handleChange}
                            required
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Phone Number"
                            name="phone_number"
                            value={leadData.phone_number}
                            onChange={handleChange}
                            required
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Company Name"
                            name="company_name"
                            value={leadData.company_name}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                </Grid>
            )}

            {activeTab === 1 && (
                <Grid container spacing={2} sx={{ marginTop: '1rem' }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Contact Name"
                            name="contact_name"
                            value={leadData.contact_name}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Follow-up Date"
                            name="follow_up_date"
                            type="date"
                            value={leadData.follow_up_date}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Assigned Salesperson"
                            name="assigned_salesperson"
                            value={leadData.assigned_salesperson}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Hotness"
                            name="hotness"
                            value={leadData.hotness}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Amount"
                            name="amount"
                            type="number"
                            value={leadData.amount}
                            onChange={handleChange}
                            fullWidth
                            margin="normal"
                        />
                    </Grid>
                </Grid>
            )}

            {activeTab === 2 && (
                <Grid container spacing={2} sx={{ marginTop: '1rem' }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Lead Status"
                            name="lead_status"
                            value={leadData.lead_status}
                            onChange={handleChange}
                            select
                            fullWidth
                            margin="normal"
                        >
                            {['new', 'in-progress', 'closed', 'won', 'lost'].map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Priority"
                            name="priority"
                            value={leadData.priority}
                            onChange={handleChange}
                            select
                            fullWidth
                            margin="normal"
                        >
                            {['low', 'medium', 'high'].map((priority) => (
                                <MenuItem key={priority} value={priority}>
                                    {priority}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            )}

            {activeTab === 3 && (
                <Grid container spacing={2} sx={{ marginTop: '1rem' }}>
                    <Grid item xs={12}>
                        <label className="field-label">Notes</label>
                        <WgiymEditor
                            value={leadData.notes || ''}
                            onChange={(value) => setLeadData({ ...leadData, notes: value })}
                        />
                    </Grid>
                </Grid>
            )}

            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ marginTop: '1rem' }}>
                Add Lead
            </Button>
        </form>
    );
};

export default LeadForm;

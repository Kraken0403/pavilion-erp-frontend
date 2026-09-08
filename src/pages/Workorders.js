import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HubSpotListing from '../components/ui/HubSpotListing';
import EntityFormDrawer from '../components/ui/EntityFormDrawer';
import CreateWorkOrder from './CreateWorkOrder';
import { fetchWorkOrders, updateWorkOrderStatus } from '../services/workOrderServices';

const fields = [{ key: 'work_order_number', label: 'Work order' }, { key: 'customer_name', label: 'Customer' }, { key: 'quotation_number', label: 'Quotation' }, { key: 'issue_date', label: 'Issue date' }, { key: 'total_amount', label: 'Total' }, { key: 'status', label: 'Status' }, { key: 'mode', label: 'Mode' }];

export default function Workorders() {
  const navigate = useNavigate(); const location = useLocation(); const [orders, setOrders] = useState([]); const [createOpen, setCreateOpen] = useState(false);
  const load = async () => { const result = await fetchWorkOrders(); setOrders(result?.workOrders || []); };
  useEffect(() => { load().catch(() => setOrders([])); }, []);
  useEffect(() => { if (new URLSearchParams(location.search).get('create') === '1') setCreateOpen(true); }, [location.search]);
  const update = async (row) => { const original = orders.find((item) => item.id === row.id); if (!original || row.status === original.status) return; await updateWorkOrderStatus(row.id, row.status); await load(); };
  const closeCreate = () => { setCreateOpen(false); if (new URLSearchParams(location.search).has('create')) navigate('/workorders', { replace: true }); };
  return <><HubSpotListing title="Work orders" createLabel="Create work order" rows={orders} initialFields={fields} onCreate={() => setCreateOpen(true)} onRowOpen={(row) => navigate(`/workorders/${row.id}`)} onUpdateRow={update} /><EntityFormDrawer open={createOpen} title="Create work order" onClose={closeCreate}><CreateWorkOrder /></EntityFormDrawer></>;
}

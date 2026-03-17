import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Chip, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography, List, ListItemButton, ListItemText } from "@mui/material";
import StatusUpdateModal from "../components/invoices/StatusUpdateModal";
import ReceiptsModal from "../components/invoices/ReceiptsModal";
import Topbar from "../components/Topbar";
import UtilsBar from "../components/UtilsBar";
import PaginationBar from "../components/ui/PaginationBar";
import NotificationSnackbar from "../components/ui/NotificationSnackbar";
import ChannelSelectModal from "../components/ui/ChannelSelectModal";
import { formatDate } from "../utils/dateFormatter";
import {
  getInvoices,
  downloadInvoicePdf,
  sendInvoiceEmail,
  sendInvoiceWhatsApp,
} from "../services/invoiceService";
import { getProformaInvoices, createTaxInvoiceFromProforma } from "../services/invoiceService";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "../assets/styles/LeadsTable.scss";
import { formatStatusLabel } from "../utils/statusFormatter";
import useAutoRefresh from "../hooks/useAutoRefresh";

const INVOICES_PER_PAGE = 20;

const statusColors = {
  draft: "default",
  issued: "primary",
  "part-payment": "warning",
  paid: "success",
  cancelled: "error",
};

function Invoices() {
  const navigate = useNavigate();

  /* ================= STATE ================= */

  const [invoices, setInvoices] = useState([]);

  /* Filters */
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState("latest");
  const [dateFilter, setDateFilter] = useState({});

  /* ================= SELECTION ================= */
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  /* Status Update Modal */
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalInvoiceId, setStatusModalInvoiceId] = useState(null);

  /* Receipts Modal */
  const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);
  const [receiptsModalInvoice, setReceiptsModalInvoice] = useState(null);

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);

  /* Snackbar */
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [proformaDialogOpen, setProformaDialogOpen] = useState(false);
  const [availableProformas, setAvailableProformas] = useState([]);
  const [loadingProformas, setLoadingProformas] = useState(false);

  /* ================= FETCH ================= */

  const loadInvoices = useCallback(async () => {
    try {
      const data = await getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setNotification({
        open: true,
        message: "❌ Failed to load invoices.",
        severity: "error",
      });
    }
  }, []);

  useAutoRefresh(loadInvoices, { intervalMs: 20000 });

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setStatusModalInvoiceId(null);
  }, []);

  const handleStatusSuccess = useCallback((msg) => {
    setNotification({ open: true, message: msg, severity: "success" });
    loadInvoices();
  }, [loadInvoices]);

  const handleStatusError = useCallback((msg) => {
    setNotification({ open: true, message: msg, severity: "error" });
  }, []);

  /* ================= SELECTION ================= */

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);

    setSelectedInvoices(
      next ? processedInvoices.map(inv => inv.id) : []
    );
  };

  const toggleSelectInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };


  /* ================= EXPORT TO EXCEL ================= */

  const exportToExcel = () => {
    if (!selectedInvoices.length) return;

    const selectedData = invoices
      .filter((inv) => selectedInvoices.includes(inv.id))
      .map((inv) => ({
        "Invoice #": inv.invoice_number,
        "Customer": `${inv.first_name || ""} ${inv.last_name || ""}`.trim(),
        "Date": formatDate(inv.issue_date),
        "Total": Number(inv.grand_total || 0).toFixed(2),
        "Status": formatStatusLabel(inv.status),
      }));

    const ws = XLSX.utils.json_to_sheet(selectedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selected Invoices");
    XLSX.writeFile(wb, "selected_invoices.xlsx");

    setSelectedInvoices([]);
    setSelectAll(false);
  };

  const handleSendReminders = async ({ sendEmail = true, sendWhatsApp = false } = {}) => {
    if (!selectedInvoices.length) return;

    const ids = [...selectedInvoices];
    const tasks = [];

    if (sendEmail) {
      tasks.push(...ids.map((invoiceId) => sendInvoiceEmail(invoiceId)));
    }

    if (sendWhatsApp) {
      tasks.push(...ids.map((invoiceId) => sendInvoiceWhatsApp(invoiceId)));
    }

    const results = await Promise.allSettled(tasks);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - successCount;

    setNotification({
      open: true,
      message:
        failedCount === 0
          ? `📩 Notification sent successfully (${successCount} request${successCount > 1 ? "s" : ""})`
          : `⚠️ Sent ${successCount} request(s), failed for ${failedCount}`,
      severity: failedCount === 0 ? "success" : "warning",
    });

    setSelectedInvoices([]);
    setSelectAll(false);
  };


  /* ================= FILTER + SORT ================= */

  const processedInvoices = useMemo(() => {
    let data = [...invoices];

    /* Search */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((inv) =>
        [
          inv.invoice_number,
          inv.first_name,
          inv.last_name,
          inv.status,
        ].some((f) =>
          String(f || "").toLowerCase().includes(q)
        )
      );
    }

    /* Date filter */
    if (dateFilter?.startDate) {
      data = data.filter(
        (inv) => new Date(inv.issue_date) >= new Date(dateFilter.startDate)
      );
    }

    if (dateFilter?.endDate) {
      data = data.filter(
        (inv) => new Date(inv.issue_date) <= new Date(dateFilter.endDate)
      );
    }

    /* Sorting */
    switch (sortValue) {
      case "latest":
        data.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
        break;
      case "oldest":
        data.sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date));
        break;
      case "az":
        data.sort((a, b) =>
          String(a.invoice_number || "").localeCompare(
            String(b.invoice_number || "")
          )
        );
        break;
      case "za":
        data.sort((a, b) =>
          String(b.invoice_number || "").localeCompare(
            String(a.invoice_number || "")
          )
        );
        break;
      default:
        break;
    }

    return data;
  }, [invoices, searchQuery, sortValue, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortValue, dateFilter]);

  /* ================= PAGINATION ================= */

  const indexOfLast = currentPage * INVOICES_PER_PAGE;
  const indexOfFirst = indexOfLast - INVOICES_PER_PAGE;
  const currentInvoices = processedInvoices.slice(
    indexOfFirst,
    indexOfLast
  );

  /* ================= STATUS ================= */

  const handleStatusChipClick = (e, invoiceId) => {
    e.stopPropagation();
    setStatusModalInvoiceId(invoiceId);
    setStatusModalOpen(true);
  };

  /* ================= PDF ================= */

  const handleExportPdf = async (e, id) => {
    e.stopPropagation();
    try {
      await downloadInvoicePdf(id);
    } catch {
      setNotification({
        open: true,
        message: "❌ PDF download failed.",
        severity: "error",
      });
    }
  };

  const handleOpenReceipts = (e, invoice) => {
    e.stopPropagation();
    setReceiptsModalInvoice(invoice);
    setReceiptsModalOpen(true);
  };

  const handleOpenCreateDialog = () => setCreateDialogOpen(true);

  const handleOpenProformaList = async () => {
    setCreateDialogOpen(false);
    setProformaDialogOpen(true);
    setLoadingProformas(true);
    try {
      const list = await getProformaInvoices();
      setAvailableProformas(Array.isArray(list) ? list : []);
    } catch (err) {
      setAvailableProformas([]);
    } finally {
      setLoadingProformas(false);
    }
  };

  const handleCreateFromProforma = async (proformaId) => {
    try {
      const res = await createTaxInvoiceFromProforma(proformaId);
      const taxInvoiceId = res?.tax_invoice?.id;
      setNotification({ open: true, message: res?.already_existed ? 'Tax invoice already exists for this proforma.' : 'Tax invoice created successfully.', severity: 'success' });
      setProformaDialogOpen(false);
      if (taxInvoiceId) navigate(`/invoices/${taxInvoiceId}`);
    } catch (err) {
      setNotification({ open: true, message: err?.response?.data?.error || 'Failed to create invoice from proforma.', severity: 'error' });
    }
  };

  /* ================= UI ================= */

  return (
    <div className="leads-table-container">
      <Topbar />

      <UtilsBar
        buttonLabel="Create Invoice"
        onButtonClick={handleOpenCreateDialog}

        selectedCount={selectedInvoices.length}
        onExportSelected={exportToExcel}
        onSendReminders={() => setChannelModalOpen(true)}

        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        onDateFilterChange={setDateFilter}
      />

      {/* Create dialog: Manual or From Proforma */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Create Invoice</DialogTitle>
        <DialogContent dividers>
          <Button
            variant="contained"
            fullWidth
            sx={{ mb: 2, borderRadius: 2, fontWeight: 700 }}
            onClick={() => { setCreateDialogOpen(false); navigate('/invoices/create') }}
          >
            Manual Entry
          </Button>
          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 2, fontWeight: 700 }}
            onClick={handleOpenProformaList}
          >
            From Proforma Invoice
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* From Proforma list dialog */}
      <Dialog
        open={proformaDialogOpen}
        onClose={() => setProformaDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Select Proforma Invoice</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 200 }}>
          {loadingProformas ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <CircularProgress />
            </div>
          ) : availableProformas.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              No proforma invoices available.
            </Typography>
          ) : (
            <List disablePadding>
              {availableProformas.map((p) => (
                <ListItemButton
                  key={p.id}
                  onClick={() => handleCreateFromProforma(p.id)}
                  divider
                >
                  <ListItemText
                    primary={p.invoice_number || `#${p.id}`}
                    secondary={`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.lead_name || '—'}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProformaDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>
                <Checkbox
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>INVOICE #</th>
              <th>CUSTOMER</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
              <th>RECEIPTS</th>
            </tr>
          </thead>

          <tbody>
            {currentInvoices.map((inv) => (
              <tr
                key={inv.id}
                className="clickable-row"
                onClick={() => navigate(`/invoices/${inv.id}`)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedInvoices.includes(inv.id)}
                    onChange={() => toggleSelectInvoice(inv.id)}
                  />
                </td>
                <td>{inv.invoice_number}</td>

                <td>
                  {inv.first_name} {inv.last_name}
                </td>

                <td>{formatDate(inv.issue_date)}</td>

                <td>₹ {Number(inv.grand_total || 0).toFixed(2)}</td>

                <td onClick={(e) => e.stopPropagation()}>
                  <Chip
                    label={formatStatusLabel(inv.status)}
                    color={statusColors[inv.status] || "default"}
                    size="small"
                    onClick={(e) => handleStatusChipClick(e, inv.id)}
                    sx={{ cursor: "pointer" }}
                  />
                </td>

                <td
                  onClick={(e) => handleExportPdf(e, inv.id)}
                  style={{ cursor: "pointer", color: "#1976d2" }}
                >
                  Export PDF
                </td>

                <td onClick={(e) => e.stopPropagation()}>
                  {inv.payments && inv.payments.length > 0 ? (
                    <Chip
                      label={`View (${inv.payments.length})`}
                      size="small"
                      color="info"
                      variant="outlined"
                      onClick={(e) => handleOpenReceipts(e, inv)}
                      sx={{ cursor: "pointer" }}
                    />
                  ) : (
                    <span style={{ color: '#999', fontSize: '12px' }}>No Receipts</span>
                  )}
                </td>
              </tr>
            ))}

            {!currentInvoices.length && (
              <tr>
                <td colSpan={8} className="table-empty-message">
                  No invoices found
                </td>
              </tr>
            )}


          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processedInvoices.length}
        itemsPerPage={INVOICES_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <NotificationSnackbar
        {...notification}
        onClose={() =>
          setNotification((prev) => ({ ...prev, open: false }))
        }
      />

      <ChannelSelectModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title="Send Invoice Reminders"
        subtitle="Select channels to notify selected customers"
        defaultEmail
        defaultWhatsApp
        confirmLabel="Send Notifications"
        onConfirm={async (selection) => {
          setChannelModalOpen(false);
          await handleSendReminders(selection);
        }}
      />

      <StatusUpdateModal
        open={statusModalOpen}
        invoiceId={statusModalInvoiceId}
        onClose={handleCloseStatusModal}
        onSuccess={handleStatusSuccess}
        onError={handleStatusError}
      />

      <ReceiptsModal
        open={receiptsModalOpen}
        invoice={receiptsModalInvoice}
        onClose={() => {
          setReceiptsModalOpen(false);
          setReceiptsModalInvoice(null);
        }}
        onError={(msg) => {
          setNotification({ open: true, message: msg, severity: "error" });
        }}
      />

    </div>
  );
}

export default Invoices;
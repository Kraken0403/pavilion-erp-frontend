import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography,
    Box,
    CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from '@mui/icons-material/Share';
import ChannelSelectModal from '../ui/ChannelSelectModal';
import { sendReceiptEmail, sendReceiptWhatsApp } from '../../services/invoiceService';
import { downloadReceiptPdf } from "../../services/invoiceService";
import { formatDate } from '../../utils/dateFormatter';

function ReceiptsModal({ open, onClose, invoice, onError }) {
    const [downloading, setDownloading] = useState(null);
    const [channelOpen, setChannelOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    const payments = invoice?.payments || [];
    const invoiceNumber = invoice?.invoice_number || `#${invoice?.id}`;

    const handleDownload = async (receiptId) => {
        if (!receiptId) return;
        try {
            setDownloading(receiptId);
            await downloadReceiptPdf(receiptId);
        } catch {
            onError?.("❌ Receipt download failed.");
        } finally {
            setDownloading(null);
        }
    };

    // use shared date formatter (dd/mm/yyyy)

    const methodColors = {
        "Bank Transfer": "primary",
        UPI: "secondary",
        Cash: "success",
        Cheque: "warning",
        Settlement: "info",
        OTHER: "info",
    };

    const methodDisplayName = (method) => {
        if (!method) return "Other";
        if (method.toUpperCase() === "OTHER") return "Settlement";
        return method;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    pb: 1,
                }}
            >
                <Box>
                    <Typography variant="h6" component="span">
                        Receipts
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                        component="span"
                    >
                        for {invoiceNumber}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {payments.length === 0 ? (
                    <Box
                        sx={{
                            textAlign: "center",
                            py: 5,
                            color: "text.secondary",
                        }}
                    >
                        <Typography variant="body1">
                            No receipts found for this invoice.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* Summary */}
                        <Box
                            sx={{
                                display: "flex",
                                gap: 22,
                                mb: 2,
                                p: 1.5,
                                bgcolor: "#f5f5f5",
                                borderRadius: 1,
                            }}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Invoice Total
                                </Typography>
                                <Typography variant="subtitle2">
                                    ₹{Number(invoice?.grand_total || 0).toFixed(2)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Total Paid
                                </Typography>
                                <Typography variant="subtitle2" color="success.main">
                                    ₹
                                    {payments
                                        .reduce((s, p) => s + Number(p.amount || 0), 0)
                                        .toFixed(2)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Balance
                                </Typography>
                                <Typography variant="subtitle2" color="error.main">
                                    ₹
                                    {(
                                        Number(invoice?.grand_total || 0) -
                                        payments.reduce((s, p) => s + Number(p.amount || 0), 0)
                                    ).toFixed(2)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Receipts
                                </Typography>
                                <Typography variant="subtitle2">{payments.length}</Typography>
                            </Box>
                        </Box>

                        {/* Receipts Table */}
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#fafafa" }}>
                                        <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Receipt No.</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">
                                            Amount
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="center">
                                            Download
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payments.map((p, idx) => (
                                        <TableRow key={p.recieptId || idx} hover>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {p.recieptId || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(p.paymentDate)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={methodDisplayName(p.paymentType)}
                                                    color={methodColors[p.paymentType] || "default"}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>
                                                    ₹{Number(p.amount || 0).toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {p.refNumber || (
                                                    <span style={{ color: "#999" }}>—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {p.remark || (
                                                    <span style={{ color: "#999" }}>—</span>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleDownload(p.recieptId)}
                                                        disabled={downloading === p.recieptId}
                                                    >
                                                        {downloading === p.recieptId ? (
                                                            <CircularProgress size={18} />
                                                        ) : (
                                                            <DownloadIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => {
                                                            setSelectedReceipt(p.recieptId);
                                                            setChannelOpen(true);
                                                        }}
                                                    >
                                                        <ShareIcon fontSize="small" />
                                                    </IconButton>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
            </DialogActions>

            <ChannelSelectModal
                open={channelOpen}
                onClose={() => { setChannelOpen(false); setSelectedReceipt(null); }}
                title={`Share Receipt ${selectedReceipt || ''} with ${invoice?.billing_snapshot?.name || invoice?.first_name || ''}`}
                subtitle={`Receipt for invoice ${invoice?.invoice_number || invoice?.id}`}
                defaultEmail={true}
                defaultWhatsApp={false}
                confirmLabel="Share Receipt"
                onConfirm={async ({ sendEmail = true, sendWhatsApp = false }) => {
                    setChannelOpen(false);
                    const rid = selectedReceipt;
                    try {
                        if (sendEmail) await sendReceiptEmail(rid);
                        if (sendWhatsApp) await sendReceiptWhatsApp(rid);
                        onError?.('📩 Receipt sent successfully.');
                    } catch (err) {
                        console.error('sendReceipt error', err);
                        onError?.('❌ Failed to send receipt.');
                    } finally {
                        setSelectedReceipt(null);
                    }
                }}
            />
        </Dialog>
    );
}

export default ReceiptsModal;

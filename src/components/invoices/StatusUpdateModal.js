import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Grid,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Typography,
    Box,
    Divider,
    IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import {
    addPaymentToInvoice,
    updateInvoiceStatus,
    getInvoiceById,
    downloadReceiptPdf,
} from "../../services/invoiceService";
import { formatStatusLabel } from "../../utils/statusFormatter";
import { toInputDateValue, formatDate } from "../../utils/dateFormatter";

const statusColors = {
    draft: "default",
    issued: "primary",
    "part-payment": "warning",
    paid: "success",
    cancelled: "error",
};

function StatusUpdateModal({ open, onClose, invoiceId, onSuccess, onError }) {
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const [fetching, setFetching] = useState(false);

    // Calculated values
    const [currentStatus, setCurrentStatus] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [payments, setPayments] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);

    // Payment form
    const [newPayment, setNewPayment] = useState({
        paymentType: "Cash",
        amount: "",
        paymentDate: toInputDateValue(new Date()),
        refNumber: "",
        remark: "",
        bankName: "",
        chequeNo: "",
    });

    // Cancellation remark
    const [cancellationRemark, setCancellationRemark] = useState("");

    // Keep latest handlers without re-triggering data fetch effect on parent rerenders.
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    /* ================= FETCH INVOICE DATA ================= */

    const fetchInvoiceDetails = useCallback(async () => {
        try {
            setFetching(true);
            const data = await getInvoiceById(invoiceId);

            setInvoice(data);
            setPayments(data.payments || []);
            setTotalAmount(Number(data.grand_total || 0));

            // Calculate status from payments
            const existingPayments = data.payments || [];
            const totalPaid = existingPayments.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0
            );
            const grandTotal = Number(data.grand_total || 0);

            let calcStatus = data.status;
            if (data.status !== "cancelled" && data.status !== "draft") {
                if (existingPayments.length > 0) {
                    calcStatus = totalPaid >= grandTotal ? "paid" : "part-payment";
                }
            }

            setCurrentStatus(calcStatus);
            setSelectedStatus(calcStatus);
        } catch (err) {
            onErrorRef.current?.("Failed to load invoice details.");
        } finally {
            setFetching(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        if (open && invoiceId) {
            fetchInvoiceDetails();
        }
    }, [open, invoiceId, fetchInvoiceDetails]);

    /* ================= COMPUTED VALUES ================= */

    const totalPaid = payments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
    );
    const remainingAmount = Math.max(0, totalAmount - totalPaid);

    /* ================= STATUS OPTIONS ================= */

    const getStatusOptions = () => {
        if (currentStatus === "cancelled") {
            return [{ value: "cancelled" }];
        }
        if (currentStatus === "paid") {
            return [{ value: "paid" }];
        }

        const options = [
            { value: "draft" },
            { value: "issued" },
            { value: "part-payment" },
            { value: "cancelled" },
        ];

        // Only show "Paid" if no existing payments (to force payment recording flow)
        if (!payments || payments.length === 0) {
            options.splice(2, 0, { value: "paid" });
        }

        return options;
    };

    const isReadOnly = currentStatus === "cancelled" || currentStatus === "paid";
    const showPaymentForm =
        !isReadOnly &&
        (selectedStatus === "paid" || selectedStatus === "part-payment");

    /* ================= HANDLERS ================= */

    const handlePaymentChange = (e) => {
        setNewPayment({ ...newPayment, [e.target.name]: e.target.value });
    };

    const handleConfirm = async () => {
        // Cancellation
        if (selectedStatus === "cancelled") {
            try {
                setLoading(true);
                await updateInvoiceStatus(invoiceId, "cancelled");
                onSuccess?.("Invoice cancelled.");
                onClose();
            } catch (err) {
                onError?.(err.response?.data?.error || "Failed to cancel invoice");
            } finally {
                setLoading(false);
            }
            return;
        }

        // Simple status change (draft / issued) - no payment involved
        if (selectedStatus === "draft" || selectedStatus === "issued") {
            try {
                setLoading(true);
                await updateInvoiceStatus(invoiceId, selectedStatus);
                onSuccess?.("Invoice status updated.");
                onClose();
            } catch (err) {
                onError?.(err.response?.data?.error || "Failed to update status");
            } finally {
                setLoading(false);
            }
            return;
        }

        // Payment-related status (paid / part-payment)
        if (selectedStatus === "paid" || selectedStatus === "part-payment") {
            const paymentAmount = Number(newPayment.amount);

            if (!paymentAmount || paymentAmount <= 0) {
                onError?.("Please enter a valid payment amount.");
                return;
            }

            if (paymentAmount > remainingAmount) {
                onError?.(
                    `Payment amount (₹${paymentAmount}) cannot exceed remaining amount (₹${remainingAmount.toFixed(2)})`
                );
                return;
            }

            try {
                setLoading(true);

                // Map Settlement → OTHER for backend
                let backendPaymentType = newPayment.paymentType;
                let refValue = newPayment.refNumber;
                let remarkValue = newPayment.remark;

                if (newPayment.paymentType === "Settlement") {
                    backendPaymentType = "OTHER";
                    refValue = "";
                }
                if (newPayment.paymentType === "Cheque") {
                    refValue = [newPayment.bankName, newPayment.chequeNo].filter(Boolean).join(" - ");
                }

                const payload = {
                    payments: [
                        {
                            paymentType: backendPaymentType,
                            amount: paymentAmount,
                            paymentDate: newPayment.paymentType === "Settlement" ? toInputDateValue(new Date()) : newPayment.paymentDate,
                            refNumber: refValue,
                            remark: remarkValue,
                        },
                    ],
                };

                await addPaymentToInvoice(invoiceId, payload);
                onSuccess?.("Payment recorded successfully!");
                onClose();
            } catch (err) {
                onError?.(err.response?.data?.error || "Failed to record payment");
            } finally {
                setLoading(false);
            }
            return;
        }
    };

    const handleDownloadReceipt = async (receiptId) => {
        if (!receiptId) return;
        try {
            await downloadReceiptPdf(receiptId);
        } catch {
            onError?.("Failed to download receipt.");
        }
    };

    /* ================= RESET ON OPEN ================= */

    useEffect(() => {
        if (open) {
            setNewPayment({
                paymentType: "Cash",
                amount: "",
                paymentDate: toInputDateValue(new Date()),
                refNumber: "",
                remark: "",
                bankName: "",
                chequeNo: "",
            });
            setCancellationRemark("");
        }
    }, [open]);

    // Pre-fill amount when status or remaining changes
    useEffect(() => {
        if (selectedStatus === "paid" && payments.length === 0) {
            setNewPayment((prev) => ({ ...prev, amount: totalAmount || "" }));
        } else if (selectedStatus === "part-payment") {
            setNewPayment((prev) => ({
                ...prev,
                amount: remainingAmount > 0 ? remainingAmount : "",
            }));
        }
    }, [selectedStatus, totalAmount, remainingAmount, payments.length]);

    /* ================= RENDER ================= */

    if (!open) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isReadOnly ? "Invoice Status" : "Update Invoice Status"}
            </DialogTitle>

            <DialogContent dividers>
                {fetching ? (
                    <Typography>Loading...</Typography>
                ) : (
                    <>
                        {/* INVOICE SUMMARY */}
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mb: 2,
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Invoice: <strong>{invoice?.invoice_number}</strong>
                            </Typography>
                            <Chip
                                label={formatStatusLabel(currentStatus)}
                                color={statusColors[currentStatus] || "default"}
                                size="small"
                            />
                        </Box>

                        {/* AMOUNT INFO */}
                        <Box
                            sx={{
                                display: "flex",
                                gap: 3,
                                mb: 2,
                                p: 1.5,
                                bgcolor: "#f5f5f5",
                                borderRadius: 1,
                            }}
                        >
                            <Typography variant="body2">
                                <strong>Total:</strong> ₹{totalAmount.toFixed(2)}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Paid:</strong> ₹{totalPaid.toFixed(2)}
                            </Typography>
                            <Typography
                                variant="body2"
                                color={remainingAmount > 0 ? "error" : "success.main"}
                            >
                                <strong>Remaining:</strong> ₹{remainingAmount.toFixed(2)}
                            </Typography>
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* CANCELLED READ-ONLY */}
                        {currentStatus === "cancelled" && (
                            <Box sx={{ textAlign: "center", py: 2 }}>
                                <Chip label="Cancelled" color="error" />
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 1 }}
                                >
                                    This invoice has been cancelled and cannot be modified.
                                </Typography>
                            </Box>
                        )}

                        {/* PAID READ-ONLY */}
                        {currentStatus === "paid" && (
                            <Box sx={{ textAlign: "center", py: 1, mb: 1 }}>
                                <Chip label="Fully Paid" color="success" />
                            </Box>
                        )}

                        {/* STATUS SELECTOR (only for non-readonly) */}
                        {!isReadOnly && (
                            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    label="Status"
                                >
                                    {getStatusOptions().map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            <Chip
                                                label={formatStatusLabel(opt.value)}
                                                color={statusColors[opt.value] || "default"}
                                                size="small"
                                            />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* CANCELLATION REMARK */}
                        {selectedStatus === "cancelled" && currentStatus !== "cancelled" && (
                            <TextField
                                fullWidth
                                label="Cancellation Remark (Optional)"
                                value={cancellationRemark}
                                onChange={(e) => setCancellationRemark(e.target.value)}
                                margin="dense"
                                multiline
                                rows={2}
                                sx={{ mb: 2 }}
                            />
                        )}

                        {/* PAYMENT FORM */}
                        {showPaymentForm && (
                            <>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    {payments.length > 0
                                        ? "Add New Payment"
                                        : "Payment Information"}
                                </Typography>
                                <Grid container spacing={2}>
                                    {/* Payment Method - always shown */}
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth margin="dense">
                                            <InputLabel>Payment Method</InputLabel>
                                            <Select
                                                name="paymentType"
                                                value={newPayment.paymentType}
                                                onChange={handlePaymentChange}
                                                label="Payment Method"
                                            >
                                                <MenuItem value="Cash">Cash</MenuItem>
                                                <MenuItem value="UPI">UPI / Netbanking</MenuItem>
                                                <MenuItem value="Cheque">Cheque</MenuItem>
                                                <MenuItem value="Settlement">Settlement</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {/* Amount - always shown */}
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Amount (₹)"
                                            name="amount"
                                            type="number"
                                            value={newPayment.amount}
                                            onChange={handlePaymentChange}
                                            margin="dense"
                                        />
                                    </Grid>

                                    {/* Payment Date - Cash, UPI, Cheque (NOT Settlement) */}
                                    {newPayment.paymentType !== "Settlement" && (
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Payment Date"
                                                name="paymentDate"
                                                type="date"
                                                InputLabelProps={{ shrink: true }}
                                                value={newPayment.paymentDate}
                                                onChange={handlePaymentChange}
                                                margin="dense"
                                            />
                                        </Grid>
                                    )}

                                    {/* Reference No - UPI only */}
                                    {newPayment.paymentType === "UPI" && (
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Reference No."
                                                name="refNumber"
                                                value={newPayment.refNumber}
                                                onChange={handlePaymentChange}
                                                margin="dense"
                                            />
                                        </Grid>
                                    )}

                                    {/* Cheque fields - Bank Name + Cheque No */}
                                    {newPayment.paymentType === "Cheque" && (
                                        <>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Bank Name"
                                                    name="bankName"
                                                    value={newPayment.bankName}
                                                    onChange={handlePaymentChange}
                                                    margin="dense"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Cheque No."
                                                    name="chequeNo"
                                                    value={newPayment.chequeNo}
                                                    onChange={handlePaymentChange}
                                                    margin="dense"
                                                />
                                            </Grid>
                                        </>
                                    )}

                                    {/* Remark - Settlement only */}
                                    {newPayment.paymentType === "Settlement" && (
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Remark"
                                                name="remark"
                                                value={newPayment.remark}
                                                onChange={handlePaymentChange}
                                                margin="dense"
                                                multiline
                                                rows={2}
                                            />
                                        </Grid>
                                    )}
                                </Grid>
                            </>
                        )}

                        {/* PREVIOUS TRANSACTIONS */}
                        {payments.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Divider sx={{ mb: 1 }} />
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Previous Transactions
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Receipt ID</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Amount</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell align="center">Receipt</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {payments.map((p, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{p.recieptId || "-"}</TableCell>
                                                <TableCell>{p.paymentType}</TableCell>
                                                <TableCell>₹{Number(p.amount).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    {p.paymentDate ? formatDate(p.paymentDate) : "-"}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleDownloadReceipt(p.recieptId)}
                                                        title="Download Receipt PDF"
                                                    >
                                                        <DownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit" disabled={loading}>
                    {isReadOnly ? "Close" : "Cancel"}
                </Button>
                {!isReadOnly && (
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        color="primary"
                        disabled={loading || fetching}
                    >
                        {loading ? "Saving..." : "Confirm"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default StatusUpdateModal;

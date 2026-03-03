import React, { useMemo, useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import '../../assets/styles/ChannelSelectModal.scss';

const ChannelSelectModal = ({
    open,
    title = 'Send Notification',
    subtitle = 'Choose notification channels',
    defaultEmail = true,
    defaultWhatsApp = false,
    confirmLabel = 'Send',
    onClose,
    onConfirm,
}) => {
    const [sendEmail, setSendEmail] = useState(defaultEmail);
    const [sendWhatsApp, setSendWhatsApp] = useState(defaultWhatsApp);

    useEffect(() => {
        if (open) {
            setSendEmail(defaultEmail);
            setSendWhatsApp(defaultWhatsApp);
        }
    }, [open, defaultEmail, defaultWhatsApp]);

    const canSubmit = useMemo(() => sendEmail || sendWhatsApp, [sendEmail, sendWhatsApp]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ className: 'channel-select-modal-paper' }}
        >
            <DialogTitle className="channel-select-modal-title">{title}</DialogTitle>

            <DialogContent>
                <p className="channel-select-modal-subtitle">{subtitle}</p>

                <div className="channel-select-options">
                    <label className={`channel-option ${sendEmail ? 'active' : ''}`}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                />
                            }
                            label={
                                <span className="channel-option-label">
                                    <span className="channel-option-icon channel-option-icon-email">
                                        <MailOutlineIcon fontSize="small" />
                                    </span>
                                    <span className="channel-option-text">
                                        <span className="channel-option-title">Email</span>
                                        <span className="channel-option-desc">Send via inbox notification</span>
                                    </span>
                                </span>
                            }
                        />
                    </label>

                    <label className={`channel-option ${sendWhatsApp ? 'active' : ''}`}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={sendWhatsApp}
                                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                                />
                            }
                            label={
                                <span className="channel-option-label">
                                    <span className="channel-option-icon channel-option-icon-wa">
                                        <WhatsAppIcon fontSize="small" />
                                    </span>
                                    <span className="channel-option-text">
                                        <span className="channel-option-title">WhatsApp</span>
                                        <span className="channel-option-desc">Send via WhatsApp message</span>
                                    </span>
                                </span>
                            }
                        />
                    </label>
                </div>
            </DialogContent>

            <DialogActions className="channel-select-modal-actions">
                <button type="button" className="secondary-btn" onClick={onClose}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="primary-btn"
                    disabled={!canSubmit}
                    onClick={() => onConfirm?.({ sendEmail, sendWhatsApp })}
                >
                    {confirmLabel}
                </button>
            </DialogActions>
        </Dialog>
    );
};

export default ChannelSelectModal;

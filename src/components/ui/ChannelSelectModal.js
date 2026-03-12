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
import { getNotificationChannelFlags } from '../../services/settingsService';
import '../../assets/styles/ChannelSelectModal.scss';

const DEFAULT_CHANNEL_FLAGS = {
    allow_email: true,
    allow_whatsapp: true,
};

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
    const [channelFlags, setChannelFlags] = useState(DEFAULT_CHANNEL_FLAGS);

    const showEmailOption = Boolean(channelFlags?.allow_email);
    const showWhatsAppOption = Boolean(channelFlags?.allow_whatsapp);

    useEffect(() => {
        let isMounted = true;

        const loadChannelFlags = async () => {
            try {
                const flags = await getNotificationChannelFlags();
                if (!isMounted || !flags) return;
                setChannelFlags({
                    allow_email: Boolean(flags.allow_email),
                    allow_whatsapp: Boolean(flags.allow_whatsapp),
                });
            } catch {
                if (!isMounted) return;
                setChannelFlags(DEFAULT_CHANNEL_FLAGS);
            }
        };

        if (open) {
            loadChannelFlags();
        }

        return () => {
            isMounted = false;
        };
    }, [open]);

    useEffect(() => {
        if (open) {
            setSendEmail(showEmailOption ? defaultEmail : false);
            setSendWhatsApp(showWhatsAppOption ? defaultWhatsApp : false);
        }
    }, [open, defaultEmail, defaultWhatsApp, showEmailOption, showWhatsAppOption]);

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
                    {showEmailOption ? (
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
                    ) : null}

                    {showWhatsAppOption ? (
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
                    ) : null}

                    {!showEmailOption && !showWhatsAppOption ? (
                        <p className="channel-select-modal-subtitle" style={{ marginTop: 4 }}>
                            No notification channel is enabled.
                        </p>
                    ) : null}
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

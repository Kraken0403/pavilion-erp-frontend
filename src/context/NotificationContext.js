import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    fetchNotificationsApi,
    fetchNotificationBubbleApi,
    markNotificationSeenApi,
    markAllNotificationsSeenApi,
    markModuleNotificationsSeenApi,
    markRecordNotificationsSeenApi,
} from '../services/notificationService';

import { connectSocket, authenticateSocket, disconnectSocket } from '../services/socket';

const NotificationContext = createContext(null);

const getNotificationSignature = (items) => {
    if (!Array.isArray(items)) return '[]';

    return JSON.stringify(
        items.map((item) => ({
            id: Number(item?.id || 0),
            isSeen: Boolean(item?.isSeen),
            module: String(item?.module || ''),
            source_id: Number(item?.source_id || 0),
            action: String(item?.action || ''),
            created_at: String(item?.created_at || ''),
            redirect_url: String(item?.redirect_url || ''),
        }))
    );
};

const getBubbleSignature = (value) => JSON.stringify({
    count: Number(value?.count || 0),
    seenNotifications: Number(value?.seenNotifications || 0),
    unSeenNotifications: Number(value?.unSeenNotifications || 0),
    leadsCount: Number(value?.leadsCount || 0),
    workOrderCount: Number(value?.workOrderCount || 0),
    kotCount: Number(value?.kotCount || 0),
    deliveryCount: Number(value?.deliveryCount || 0),
    feedbackCount: Number(value?.feedbackCount || 0),
});

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated, modulePermissions } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [bubbleCounts, setBubbleCounts] = useState({
        count: 0,
        seenNotifications: 0,
        unSeenNotifications: 0,
        leadsCount: 0,
        workOrderCount: 0,
        kotCount: 0,
        deliveryCount: 0,
        feedbackCount: 0,
    });
    const [totalUnseen, setTotalUnseen] = useState(0);
    // update tab badge/title when unseen count changes
    useTabBadge(totalUnseen);
    const isFetchingNotificationsRef = useRef(false);
    const isFetchingBubblesRef = useRef(false);

    const unreadNotifications = useMemo(
        () => notifications.filter((item) => !item?.isSeen),
        [notifications]
    );

    const unreadByModuleSource = useMemo(() => {
        const index = {};

        unreadNotifications.forEach((item) => {
            const moduleKey = String(item?.module || '').trim().toLowerCase();
            const sourceId = Number(item?.source_id || 0);
            if (!moduleKey || !sourceId) return;

            const key = `${moduleKey}:${sourceId}`;
            if (!index[key]) {
                index[key] = item;
            }
        });

        return index;
    }, [unreadNotifications]);

    const unreadCountByModuleSource = useMemo(() => {
        const index = {};

        unreadNotifications.forEach((item) => {
            const moduleKey = String(item?.module || '').trim().toLowerCase();
            const sourceId = Number(item?.source_id || 0);
            if (!moduleKey || !sourceId) return;

            const key = `${moduleKey}:${sourceId}`;
            index[key] = Number(index[key] || 0) + 1;
        });

        return index;
    }, [unreadNotifications]);

    const getUnreadNotificationFor = useCallback(
        (moduleName, sourceId) => {
            const moduleKey = String(moduleName || '').trim().toLowerCase();
            const id = Number(sourceId || 0);
            if (!moduleKey || !id) return null;

            return unreadByModuleSource[`${moduleKey}:${id}`] || null;
        },
        [unreadByModuleSource]
    );

    const getUnreadCountFor = useCallback(
        (moduleName, sourceId) => {
            const moduleKey = String(moduleName || '').trim().toLowerCase();
            const id = Number(sourceId || 0);
            if (!moduleKey || !id) return 0;

            return Number(unreadCountByModuleSource[`${moduleKey}:${id}`] || 0);
        },
        [unreadCountByModuleSource]
    );

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        if (isFetchingNotificationsRef.current) return;

        isFetchingNotificationsRef.current = true;

        try {
            const data = await fetchNotificationsApi();
            const nextNotifications = Array.isArray(data?.result) ? data.result : [];

            // Filter notifications by module permissions so users don't see modules they
            // don't have access to.
            const permKeyMap = {
                kot: 'kots',
                delivery: 'deliveries',
                work_orders: 'work_orders',
                leads: 'leads',
            };

            const filtered = nextNotifications.filter((item) => {
                const moduleKey = String(item?.module || '').trim().toLowerCase();
                if (!moduleKey) return true;
                const permKey = permKeyMap[moduleKey] || moduleKey;
                if (modulePermissions && Object.prototype.hasOwnProperty.call(modulePermissions, permKey)) {
                    return Boolean(modulePermissions[permKey]);
                }
                return true;
            });

            setNotifications((prev) => {
                const prevSignature = getNotificationSignature(prev);
                const nextSignature = getNotificationSignature(filtered);
                return prevSignature === nextSignature ? prev : filtered;
            });

            if (typeof data?.unSeenNotifications === 'number') {
                const nextUnseen = Number(data.unSeenNotifications || 0);
                setTotalUnseen((prev) => (Number(prev || 0) === nextUnseen ? prev : nextUnseen));
            }
        } catch (error) {
            console.warn('fetchNotifications error:', error?.response?.data || error.message || error);
        } finally {
            isFetchingNotificationsRef.current = false;
        }
    }, [isAuthenticated, modulePermissions]);

    const fetchBubbleCounts = useCallback(async () => {
        if (!isAuthenticated) return;
        if (isFetchingBubblesRef.current) return;

        isFetchingBubblesRef.current = true;

        try {
            // If the user has no permissions for any of the modules that appear in
            // bubble counts, short-circuit and zero out counts locally.
            const relevantPerms = ['leads', 'work_orders', 'kots', 'deliveries'];
            if (
                modulePermissions &&
                relevantPerms.every((p) => Object.prototype.hasOwnProperty.call(modulePermissions, p) && modulePermissions[p] === false)
            ) {
                setBubbleCounts({
                    count: 0,
                    seenNotifications: 0,
                    unSeenNotifications: 0,
                    leadsCount: 0,
                    workOrderCount: 0,
                    kotCount: 0,
                    deliveryCount: 0,
                    feedbackCount: 0,
                });
                setTotalUnseen(0);
                return;
            }

            const data = await fetchNotificationBubbleApi();
            // Build counts but respect module permissions: if a module is hidden for the
            // current user, do not surface its counts.
            const raw = {
                count: Number(data?.count || 0),
                seenNotifications: Number(data?.seenNotifications || 0),
                unSeenNotifications: Number(data?.unSeenNotifications || 0),
                leadsCount: Number(data?.leadsCount || 0),
                workOrderCount: Number(data?.workOrderCount || 0),
                kotCount: Number(data?.kotCount || 0),
                deliveryCount: Number(data?.deliveryCount || 0),
                feedbackCount: Number(data?.feedbackCount || 0),
            };

            const next = {
                count: raw.count,
                seenNotifications: raw.seenNotifications,
                unSeenNotifications: raw.unSeenNotifications,
                leadsCount: modulePermissions?.leads === false ? 0 : raw.leadsCount,
                workOrderCount: modulePermissions?.work_orders === false ? 0 : raw.workOrderCount,
                kotCount: modulePermissions?.kots === false ? 0 : raw.kotCount,
                deliveryCount: modulePermissions?.deliveries === false ? 0 : raw.deliveryCount,
                feedbackCount: raw.feedbackCount,
            };

            setBubbleCounts((prev) => {
                const prevSignature = getBubbleSignature(prev);
                const nextSignature = getBubbleSignature(next);
                return prevSignature === nextSignature ? prev : next;
            });

            setTotalUnseen((prev) => (
                Number(prev || 0) === Number(next.unSeenNotifications || 0)
                    ? prev
                    : Number(next.unSeenNotifications || 0)
            ));
        } catch (error) {
                // If backend denies access to the bubble endpoint (admin-only), fall
                // back to computing counts from the notifications list which is
                // available to regular users.
                console.warn('fetchBubbleCounts error:', error?.response?.data || error.message || error);

                const isAdminRequired = error?.response?.status === 403 || String(error?.response?.data?.error || '').toLowerCase().includes('admin');
                if (isAdminRequired) {
                    try {
                        const payload = await fetchNotificationsApi();
                        const items = Array.isArray(payload?.result) ? payload.result : [];

                        // Apply same permission filtering as notifications
                        const permKeyMap = { kot: 'kots', delivery: 'deliveries', work_orders: 'work_orders', leads: 'leads' };
                        const filtered = items.filter((item) => {
                            const moduleKey = String(item?.module || '').trim().toLowerCase();
                            if (!moduleKey) return true;
                            const permKey = permKeyMap[moduleKey] || moduleKey;
                            if (modulePermissions && Object.prototype.hasOwnProperty.call(modulePermissions, permKey)) {
                                return Boolean(modulePermissions[permKey]);
                            }
                            return true;
                        });

                        const counts = filtered.reduce((acc, it) => {
                            acc.count += 1;
                            if (it.isSeen) acc.seenNotifications += 1; else acc.unSeenNotifications += 1;
                            const mod = String(it.module || '').trim().toLowerCase();
                            if (mod === 'leads') acc.leadsCount += 1;
                            else if (mod === 'work_orders') acc.workOrderCount += 1;
                            else if (mod === 'kot') acc.kotCount += 1;
                            else if (mod === 'delivery') acc.deliveryCount += 1;
                            else if (mod === 'feedback') acc.feedbackCount += 1;
                            return acc;
                        }, { count: 0, seenNotifications: 0, unSeenNotifications: 0, leadsCount: 0, workOrderCount: 0, kotCount: 0, deliveryCount: 0, feedbackCount: 0 });

                        setBubbleCounts((prev) => {
                            const prevSignature = getBubbleSignature(prev);
                            const nextSignature = getBubbleSignature(counts);
                            return prevSignature === nextSignature ? prev : counts;
                        });

                        setTotalUnseen((prev) => (Number(prev || 0) === Number(counts.unSeenNotifications || 0) ? prev : Number(counts.unSeenNotifications || 0)));
                        return;
                    } catch (innerErr) {
                        console.warn('Fallback compute bubble counts failed:', innerErr?.response?.data || innerErr.message || innerErr);
                    }
                }

                // If no fallback succeeded, ensure counts are at least zeroed.
                setBubbleCounts((prev) => prev || {
                    count: 0,
                    seenNotifications: 0,
                    unSeenNotifications: 0,
                    leadsCount: 0,
                    workOrderCount: 0,
                    kotCount: 0,
                    deliveryCount: 0,
                    feedbackCount: 0,
                });
        } finally {
            isFetchingBubblesRef.current = false;
        }
    }, [isAuthenticated, modulePermissions]);

    const markNotificationSeen = useCallback(async (id) => {
        await markNotificationSeenApi(id);

        let wasUnseen = false;
        let targetModule = null;

        setNotifications((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                targetModule = item.module;
                if (!item.isSeen) {
                    wasUnseen = true;
                }
                return { ...item, isSeen: true };
            })
        );

        if (!wasUnseen) return;

        setTotalUnseen((prev) => Math.max(0, Number(prev || 0) - 1));

        setBubbleCounts((prev) => {
            const next = { ...prev };
            next.unSeenNotifications = Math.max(0, Number(prev.unSeenNotifications || 0) - 1);
            next.seenNotifications = Number(prev.seenNotifications || 0) + 1;

            if (targetModule === 'leads') {
                next.leadsCount = Math.max(0, Number(prev.leadsCount || 0) - 1);
            } else if (targetModule === 'work_orders') {
                next.workOrderCount = Math.max(0, Number(prev.workOrderCount || 0) - 1);
            } else if (targetModule === 'kot') {
                next.kotCount = Math.max(0, Number(prev.kotCount || 0) - 1);
            } else if (targetModule === 'delivery') {
                next.deliveryCount = Math.max(0, Number(prev.deliveryCount || 0) - 1);
            } else if (targetModule === 'feedback') {
                next.feedbackCount = Math.max(0, Number(prev.feedbackCount || 0) - 1);
            }

            return next;
        });
    }, []);

    const markAllNotificationsSeen = useCallback(async () => {
        await markAllNotificationsSeenApi();

        setNotifications((prev) => prev.map((item) => ({ ...item, isSeen: true })));
        setTotalUnseen(0);

        setBubbleCounts((prev) => ({
            ...prev,
            seenNotifications: Number(prev.count || 0),
            unSeenNotifications: 0,
            leadsCount: 0,
            workOrderCount: 0,
            kotCount: 0,
            deliveryCount: 0,
            feedbackCount: 0,
        }));
    }, []);

    const markModuleNotificationsSeen = useCallback(async (moduleName) => {
        const safeModule = String(moduleName || '').trim().toLowerCase();
        if (!safeModule) return;

        await markModuleNotificationsSeenApi(safeModule);

        setNotifications((prev) => prev.map((item) => {
            if (String(item?.module || '').trim().toLowerCase() !== safeModule) return item;
            return { ...item, isSeen: true };
        }));

        await Promise.all([fetchBubbleCounts(), fetchNotifications()]);
    }, [fetchBubbleCounts, fetchNotifications]);

    const markRecordNotificationsSeen = useCallback(async (moduleName, sourceId) => {
        const safeModule = String(moduleName || '').trim().toLowerCase();
        const safeSourceId = Number(sourceId || 0);
        if (!safeModule || !safeSourceId) return;

        await markRecordNotificationsSeenApi(safeModule, safeSourceId);

        setNotifications((prev) => prev.map((item) => {
            const itemModule = String(item?.module || '').trim().toLowerCase();
            const itemSourceId = Number(item?.source_id || 0);
            if (itemModule !== safeModule || itemSourceId !== safeSourceId) return item;
            return { ...item, isSeen: true };
        }));

        await Promise.all([fetchBubbleCounts(), fetchNotifications()]);
    }, [fetchBubbleCounts, fetchNotifications]);

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setBubbleCounts({
                count: 0,
                seenNotifications: 0,
                unSeenNotifications: 0,
                leadsCount: 0,
                workOrderCount: 0,
                kotCount: 0,
                deliveryCount: 0,
                feedbackCount: 0,
            });
            setTotalUnseen(0);
            return;
        }

        fetchBubbleCounts();
        fetchNotifications();

        const intervalId = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            fetchBubbleCounts();
        }, 30000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAuthenticated, fetchBubbleCounts, fetchNotifications]);

    // Socket: listen for real-time notifications and update local state optimistically
    useEffect(() => {
        if (!isAuthenticated) return undefined;

        const token = localStorage.getItem('token');
        const socket = connectSocket();

        const handleNotification = (n) => {
            const normalized = {
                id: Number(n?.id || 0),
                module: String(n?.module || '').trim().toLowerCase(),
                action: n?.action || null,
                source_id: Number(n?.sourceId || n?.source_id || 0),
                redirect_url: n?.redirectUrl || n?.redirect_url || null,
                isSeen: false,
                created_at: n?.created_at || new Date().toISOString(),
                by_user_id: n?.byUserId || n?.by_userId || null,
            };

            setNotifications((prev) => {
                const exists = Array.isArray(prev) && prev.some((it) => Number(it?.id || 0) === Number(normalized.id || 0));
                if (exists) return prev;
                return [normalized, ...prev];
            });

            setBubbleCounts((prev) => {
                const next = { ...(prev || {}) };
                next.count = Number(prev?.count || 0) + 1;
                next.unSeenNotifications = Number(prev?.unSeenNotifications || 0) + 1;

                const m = normalized.module;
                if (m === 'leads') next.leadsCount = Number(prev?.leadsCount || 0) + 1;
                else if (m === 'work_orders') next.workOrderCount = Number(prev?.workOrderCount || 0) + 1;
                else if (m === 'kot') next.kotCount = Number(prev?.kotCount || 0) + 1;
                else if (m === 'delivery') next.deliveryCount = Number(prev?.deliveryCount || 0) + 1;
                else if (m === 'feedback') next.feedbackCount = Number(prev?.feedbackCount || 0) + 1;

                return next;
            });

            setTotalUnseen((prev) => Number(prev || 0) + 1);
        };

        socket.on('notification', handleNotification);
        if (token) authenticateSocket(token);

        return () => {
            try { socket.off('notification', handleNotification); } catch (e) { }
            try { disconnectSocket(); } catch (e) { }
        };
    }, [isAuthenticated]);

    const contextValue = useMemo(
        () => ({
            notifications,
            unreadNotifications,
            bubbleCounts,
            totalUnseen,
            fetchNotifications,
            fetchBubbleCounts,
            markNotificationSeen,
            markAllNotificationsSeen,
            markModuleNotificationsSeen,
            markRecordNotificationsSeen,
            getUnreadNotificationFor,
            getUnreadCountFor,
        }),
        [
            notifications,
            unreadNotifications,
            bubbleCounts,
            totalUnseen,
            fetchNotifications,
            fetchBubbleCounts,
            markNotificationSeen,
            markAllNotificationsSeen,
            markModuleNotificationsSeen,
            markRecordNotificationsSeen,
            getUnreadNotificationFor,
            getUnreadCountFor,
        ]
    );

    return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};



export const useNotification = () => useContext(NotificationContext);

// Tab badge: reflect unseen notifications using App Badging API when available,
// otherwise prepend a dot/count to the document title.
export function useTabBadge(totalUnseen) {
    const originalTitleRef = React.useRef(typeof document !== 'undefined' ? document.title : '');

    React.useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.setAppBadge) {
            try {
                if (Number(totalUnseen || 0) > 0) {
                    navigator.setAppBadge(Number(totalUnseen || 0));
                } else {
                    navigator.clearAppBadge && navigator.clearAppBadge();
                }
            } catch (e) {
                // ignore
            }
            return;
        }

        // Fallback: update document.title
        try {
            const orig = originalTitleRef.current || '';
            if (Number(totalUnseen || 0) > 0) {
                document.title = `(${Number(totalUnseen || 0)}) ${orig}`;
            } else {
                document.title = orig;
            }
        } catch (e) {
            // ignore
        }

        const savedOrig = originalTitleRef.current;
        return () => {
            try { document.title = savedOrig || ''; } catch (e) { }
        };
    }, [totalUnseen]);
}

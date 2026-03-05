import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    fetchNotificationsApi,
    fetchNotificationBubbleApi,
    markNotificationSeenApi,
    markAllNotificationsSeenApi,
    markModuleNotificationsSeenApi,
    markRecordNotificationsSeenApi,
} from '../services/notificationService';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
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

        const data = await fetchNotificationsApi();
        setNotifications(Array.isArray(data?.result) ? data.result : []);

        if (typeof data?.unSeenNotifications === 'number') {
            setTotalUnseen(data.unSeenNotifications);
        }
    }, [isAuthenticated]);

    const fetchBubbleCounts = useCallback(async () => {
        if (!isAuthenticated) return;

        const data = await fetchNotificationBubbleApi();
        const next = {
            count: Number(data?.count || 0),
            seenNotifications: Number(data?.seenNotifications || 0),
            unSeenNotifications: Number(data?.unSeenNotifications || 0),
            leadsCount: Number(data?.leadsCount || 0),
            workOrderCount: Number(data?.workOrderCount || 0),
            kotCount: Number(data?.kotCount || 0),
            deliveryCount: Number(data?.deliveryCount || 0),
            feedbackCount: Number(data?.feedbackCount || 0),
        };

        setBubbleCounts(next);
        setTotalUnseen(next.unSeenNotifications);
    }, [isAuthenticated]);

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

        await fetchBubbleCounts();
        await fetchNotifications();
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

        await fetchBubbleCounts();
        await fetchNotifications();
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
            fetchBubbleCounts();
            fetchNotifications();
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAuthenticated, fetchBubbleCounts, fetchNotifications]);

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

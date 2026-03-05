import api from './api';

const handleError = (error, context = 'Notification error') => {
    console.error(`❌ ${context}:`, error.response?.data || error.message || error);
    throw error;
};

export const fetchNotificationsApi = async () => {
    try {
        const response = await api.get('/notifications');
        return response.data;
    } catch (error) {
        handleError(error, 'Failed to fetch notifications');
    }
};

export const fetchNotificationBubbleApi = async () => {
    try {
        const response = await api.get('/notifications/bubble');
        return response.data;
    } catch (error) {
        handleError(error, 'Failed to fetch notification bubble counts');
    }
};

export const markNotificationSeenApi = async (id) => {
    try {
        const response = await api.patch(`/notifications/status/${id}`);
        return response.data;
    } catch (error) {
        handleError(error, 'Failed to mark notification as seen');
    }
};

export const markAllNotificationsSeenApi = async () => {
    try {
        const response = await api.patch('/notifications/status/mark-all');
        return response.data;
    } catch (error) {
        handleError(error, 'Failed to mark all notifications as seen');
    }
};

export const markModuleNotificationsSeenApi = async (moduleName) => {
    try {
        const safeModule = encodeURIComponent(String(moduleName || '').trim().toLowerCase());
        const response = await api.patch(`/notifications/status/mark-all/${safeModule}`);
        return response.data;
    } catch (error) {
        handleError(error, 'Failed to mark module notifications as seen');
    }
};

export const markRecordNotificationsSeenApi = async (moduleName, sourceId) => {
    try {
        const safeModule = encodeURIComponent(String(moduleName || '').trim().toLowerCase());
        const safeSourceId = Number(sourceId || 0);
        if (!safeModule || !safeSourceId) return null;

        const response = await api.patch(`/notifications/status/record/${safeModule}/${safeSourceId}`);
        return response.data;
    } catch (error) {
        handleError(error, 'Failed to mark record notifications as seen');
    }
};

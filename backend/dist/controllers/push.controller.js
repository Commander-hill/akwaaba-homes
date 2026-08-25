"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestPush = exports.unsubscribe = exports.subscribe = exports.getPublicKey = void 0;
const push_service_1 = require("../services/push.service");
const getPublicKey = (req, res) => {
    try {
        const key = (0, push_service_1.getVapidPublicKey)();
        res.status(200).json({ publicKey: key });
    }
    catch (error) {
        console.error('Error fetching VAPID public key:', error);
        res.status(500).json({ message: 'Failed to fetch public key' });
    }
};
exports.getPublicKey = getPublicKey;
const subscribe = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { subscription } = req.body;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!subscription || !subscription.endpoint) {
            res.status(400).json({ message: 'Invalid subscription payload' });
            return;
        }
        await (0, push_service_1.saveSubscription)(userId, subscription);
        res.status(201).json({ message: 'Push subscription saved successfully' });
    }
    catch (error) {
        console.error('Error saving push subscription:', error);
        res.status(500).json({ message: 'Failed to save push subscription' });
    }
};
exports.subscribe = subscribe;
const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            res.status(400).json({ message: 'Endpoint required' });
            return;
        }
        await (0, push_service_1.removeSubscription)(endpoint);
        res.status(200).json({ message: 'Push subscription removed' });
    }
    catch (error) {
        console.error('Error removing push subscription:', error);
        res.status(500).json({ message: 'Failed to remove push subscription' });
    }
};
exports.unsubscribe = unsubscribe;
const sendTestPush = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        await (0, push_service_1.sendPushToUser)(userId, {
            title: 'Akwaaba Homes Notification',
            body: 'Web Push Notifications are active on this device!',
            url: '/dashboard'
        });
        res.status(200).json({ message: 'Test push notification sent' });
    }
    catch (error) {
        console.error('Error sending test push:', error);
        res.status(500).json({ message: 'Failed to send test push' });
    }
};
exports.sendTestPush = sendTestPush;
//# sourceMappingURL=push.controller.js.map
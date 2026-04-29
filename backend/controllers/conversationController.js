'use strict';

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Property = require('../models/Property');
const User = require('../models/User');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeMessage = (value) => String(value || '').trim().slice(0, 2000);

const buildMemberMap = async (userIds = []) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return new Map();
    const unique = Array.from(new Set(userIds.map((id) => String(id))));
    const members = await User.find({ _id: { $in: unique } })
        .select('_id name email')
        .lean();
    return new Map(members.map((user) => [String(user._id), user]));
};

const shapeConversationSummary = (conversation, memberMap, currentUserId) => {
    const members = Array.isArray(conversation.members) ? conversation.members : [];
    const otherMemberId = members.find((memberId) => String(memberId) !== String(currentUserId)) || members[0];
    const otherMember = otherMemberId ? memberMap.get(String(otherMemberId)) : null;
    const lastMessage = Array.isArray(conversation.messages) && conversation.messages.length > 0
        ? conversation.messages[conversation.messages.length - 1]
        : null;
    return {
        _id: conversation._id,
        property: conversation.property || null,
        participants: {
            me: memberMap.get(String(currentUserId)) || null,
            other: otherMember || null,
        },
        lastMessage: lastMessage ? {
            text: lastMessage.text,
            sender: lastMessage.sender,
            createdAt: lastMessage.createdAt,
        } : null,
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt,
    };
};

const listConversations = async (req, res) => {
    try {
        const currentUserId = req.user && req.user.id;
        const conversations = await Conversation.find({ members: currentUserId })
            .populate('property', 'title address price images')
            .sort({ updatedAt: -1 })
            .lean();
        const memberIds = conversations.flatMap((conversation) => conversation.members || []);
        const memberMap = await buildMemberMap(memberIds);
        const data = conversations.map((conversation) =>
            shapeConversationSummary(conversation, memberMap, currentUserId)
        );
        return res.json({ success: true, count: data.length, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

const startConversation = async (req, res) => {
    try {
        const currentUserId = req.user && req.user.id;
        const { propertyId, message } = req.body || {};
        if (!isObjectId(propertyId)) {
            return res.status(400).json({ success: false, message: 'Valid propertyId is required.' });
        }
        const text = normalizeMessage(message);
        if (!text) {
            return res.status(400).json({ success: false, message: 'Initial message is required.' });
        }

        const property = await Property.findById(propertyId)
            .select('_id owner agent contact title address price images')
            .lean();
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found.' });
        }

        const managerId = property.owner || property.agent;
        if (!managerId) {
            return res.status(400).json({
                success: false,
                message: 'This listing does not have a registered manager account for chat yet.',
            });
        }

        const memberIds = [String(currentUserId), String(managerId)].sort();
        let conversation = await Conversation.findOne({
            property: property._id,
            membersKey: memberIds.join(':'),
        });
        if (!conversation) {
            conversation = await Conversation.create({
                property: property._id,
                members: memberIds,
                membersKey: memberIds.join(':'),
                messages: [],
            });
        }

        conversation.messages.push({
            sender: currentUserId,
            text,
            createdAt: new Date(),
        });
        await conversation.save();

        const populated = await Conversation.findById(conversation._id)
            .populate('property', 'title address price images')
            .lean();
        const memberMap = await buildMemberMap(populated.members || []);

        return res.status(201).json({
            success: true,
            data: shapeConversationSummary(populated, memberMap, currentUserId),
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

const getConversation = async (req, res) => {
    try {
        const currentUserId = req.user && req.user.id;
        const conversationId = req.params.id;
        if (!isObjectId(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
        }
        const conversation = await Conversation.findById(conversationId)
            .populate('property', 'title address price images')
            .lean();
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        const isParticipant = Array.isArray(conversation.members)
            && conversation.members.some((memberId) => String(memberId) === String(currentUserId));
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this conversation.' });
        }

        const memberMap = await buildMemberMap(conversation.members || []);
        return res.json({
            success: true,
            data: {
                ...shapeConversationSummary(conversation, memberMap, currentUserId),
                messages: (conversation.messages || []).map((message) => ({
                    _id: message._id,
                    sender: message.sender,
                    senderUser: memberMap.get(String(message.sender)) || null,
                    text: message.text,
                    createdAt: message.createdAt,
                })),
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

const sendConversationMessage = async (req, res) => {
    try {
        const currentUserId = req.user && req.user.id;
        const conversationId = req.params.id;
        if (!isObjectId(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
        }
        const text = normalizeMessage(req.body && req.body.message);
        if (!text) {
            return res.status(400).json({ success: false, message: 'Message is required.' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        const isParticipant = Array.isArray(conversation.members)
            && conversation.members.some((memberId) => String(memberId) === String(currentUserId));
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized to post in this conversation.' });
        }

        conversation.messages.push({
            sender: currentUserId,
            text,
            createdAt: new Date(),
        });
        await conversation.save();

        const latestMessage = conversation.messages[conversation.messages.length - 1];
        return res.status(201).json({
            success: true,
            data: {
                _id: latestMessage._id,
                sender: latestMessage.sender,
                text: latestMessage.text,
                createdAt: latestMessage.createdAt,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

module.exports = {
    listConversations,
    startConversation,
    getConversation,
    sendConversationMessage,
};

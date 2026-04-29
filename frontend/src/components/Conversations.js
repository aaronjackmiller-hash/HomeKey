import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  getConversations,
  getConversationMessages,
  openConversationForListing,
  sendConversationMessage,
} from '../services/api';

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const getOtherParticipantName = (conversation, currentUserId) => {
  if (!conversation || !Array.isArray(conversation.participants)) return 'Conversation';
  const other = conversation.participants.find(
    (participant) => participant && String(participant._id) !== String(currentUserId)
  );
  return other?.name || 'Conversation';
};

const Conversations = () => {
  const history = useHistory();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => String(conversation._id) === String(activeConversationId)) || null,
    [conversations, activeConversationId]
  );

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed._id) setCurrentUserId(parsed._id);
      } catch (err) {
        // ignore invalid local storage value
      }
    }
  }, []);

  const loadConversations = async (nextActiveId = '') => {
    setLoadingConversations(true);
    try {
      const response = await getConversations();
      const list = response?.data || [];
      setConversations(list);
      if (nextActiveId) {
        setActiveConversationId(nextActiveId);
      } else if (list.length > 0) {
        setActiveConversationId((prev) => (prev ? prev : list[0]._id));
      } else {
        setActiveConversationId('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(location.search);
      const propertyId = params.get('propertyId');
      const recipientId = params.get('recipientId');
      if (propertyId && recipientId) {
        try {
          const created = await openConversationForListing({ propertyId, recipientId });
          const conversationId = created?.data?._id;
          await loadConversations(conversationId || '');
          return;
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to start conversation.');
        }
      }
      await loadConversations('');
    };
    init();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }
      setLoadingMessages(true);
      try {
        const response = await getConversationMessages(activeConversationId);
        setMessages(response?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load messages.');
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [activeConversationId]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      await sendConversationMessage(activeConversationId, { body: newMessage.trim() });
      setNewMessage('');
      const response = await getConversationMessages(activeConversationId);
      setMessages(response?.data || []);
      await loadConversations(activeConversationId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-layout">
        <aside className="chat-list-panel">
          <div className="chat-panel-header">
            <h2>Conversations</h2>
            <button type="button" className="secondary-btn" onClick={() => history.push('/')}>
              Back to listings
            </button>
          </div>
          {loadingConversations ? (
            <p>Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <p>No conversations yet.</p>
          ) : (
            <div className="chat-conversation-list">
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation._id}
                  className={`chat-conversation-item ${String(conversation._id) === String(activeConversationId) ? 'active' : ''}`}
                  onClick={() => setActiveConversationId(conversation._id)}
                >
                  <strong>{getOtherParticipantName(conversation, currentUserId)}</strong>
                  <span>{conversation.property?.title || conversation.property?.address?.street || 'Property'}</span>
                  <small>{conversation.lastMessage?.body || 'No messages yet'}</small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="chat-thread-panel">
          {selectedConversation ? (
            <>
              <div className="chat-thread-header">
                <h3>{selectedConversation.property?.title || selectedConversation.property?.address?.street || 'Conversation'}</h3>
                <p>Last update: {formatTimestamp(selectedConversation.updatedAt)}</p>
              </div>
              <div className="chat-thread-messages">
                {loadingMessages ? (
                  <p>Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="chat-empty">No messages yet.</p>
                ) : (
                  messages.map((message) => {
                    const isMe = String(message.sender?._id || '') === String(currentUserId || '');
                    return (
                      <div key={message._id} className={`chat-message ${isMe ? 'chat-message-me' : 'chat-message-other'}`}>
                        <p>{message.body}</p>
                        <small>{formatTimestamp(message.createdAt)}</small>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="chat-thread-form" onSubmit={handleSend}>
                <input
                  type="text"
                  value={newMessage}
                  placeholder="Type your message…"
                  onChange={(event) => setNewMessage(event.target.value)}
                />
                <button type="submit" className="primary-btn" disabled={sending}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state">
              <h3>Select a conversation</h3>
              <p>Your conversations will be displayed here.</p>
            </div>
          )}
          {error && <p className="status-message status-message-error">{error}</p>}
        </section>
      </div>
    </div>
  );
};

export default Conversations;

import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteMyInstantAlertSearch,
  getMyInstantAlertInbox,
  getMyInstantAlerts,
  markMyInstantAlertReadState,
  updateMyInstantAlertSettings,
  upsertMyInstantAlertSearch,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return `₪${parsed.toLocaleString()}`;
};

const toDisplayType = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'rental') return 'Rental';
  if (normalized === 'sale') return 'Sale';
  return '';
};

const summarizeSearchCriteria = (search = {}) => {
  const criteria = search.criteria || {};
  const summaryBits = [];
  const typeLabel = toDisplayType(criteria.type);
  if (typeLabel) summaryBits.push(typeLabel);
  if (criteria.city) summaryBits.push(criteria.city);
  if (criteria.rooms) summaryBits.push(`Beds: ${criteria.rooms}`);
  if (criteria.baths) summaryBits.push(`Baths: ${criteria.baths}`);
  if (criteria.minPrice != null) summaryBits.push(`Min ${formatCurrency(criteria.minPrice)}`);
  if (criteria.maxPrice != null) summaryBits.push(`Max ${formatCurrency(criteria.maxPrice)}`);
  if (criteria.searchText) summaryBits.push(`Search: ${criteria.searchText}`);
  const cityHints = Array.isArray(criteria.cityHints) ? criteria.cityHints : [];
  if (cityHints.length > 0) summaryBits.push(`Area: ${cityHints.join(', ')}`);
  if (criteria.circle && criteria.circle.radiusMeters) {
    const kilometers = Number(criteria.circle.radiusMeters) / 1000;
    if (Number.isFinite(kilometers) && kilometers > 0) {
      summaryBits.push(`Circle ${kilometers.toFixed(2)}km`);
    }
  }
  return summaryBits.length > 0 ? summaryBits.join(' • ') : 'No filters captured yet.';
};

const formatDeliveryPreferenceLabel = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'whatsapp') return 'WhatsApp';
  if (normalized === 'email') return 'Email';
  return 'Account preference';
};

const InstantAlerts = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [settings, setSettings] = useState({
    enabled: false,
    deliveryPreference: 'account',
    accountPreferredContactMethod: 'email',
    unreadCount: 0,
  });
  const [savedSearches, setSavedSearches] = useState([]);
  const [inbox, setInbox] = useState([]);

  const loadAlertsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertState, inboxState] = await Promise.all([
        getMyInstantAlerts(),
        getMyInstantAlertInbox(),
      ]);
      const alertData = alertState?.data || {};
      setSettings({
        enabled: alertData.enabled === true,
        deliveryPreference: alertData.deliveryPreference || 'account',
        accountPreferredContactMethod: alertData.accountPreferredContactMethod || user?.preferredContactMethod || 'email',
        unreadCount: Number(alertData.unreadCount || 0),
      });
      setSavedSearches(Array.isArray(alertData.savedSearches) ? alertData.savedSearches : []);
      setInbox(Array.isArray(inboxState?.data) ? inboxState.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your instant alerts right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertsData();
  }, []);

  const refreshInbox = async () => {
    const inboxState = await getMyInstantAlertInbox();
    setInbox(Array.isArray(inboxState?.data) ? inboxState.data : []);
    setSettings((prev) => ({
      ...prev,
      unreadCount: Number(inboxState?.unreadCount || 0),
    }));
  };

  const updateSettings = async (nextSettings) => {
    setSaving(true);
    setStatusMessage('');
    try {
      const result = await updateMyInstantAlertSettings(nextSettings);
      const data = result?.data || {};
      setSettings((previous) => ({
        ...previous,
        enabled: data.enabled === true,
        deliveryPreference: data.deliveryPreference || previous.deliveryPreference || 'account',
        accountPreferredContactMethod: data.accountPreferredContactMethod || previous.accountPreferredContactMethod || 'email',
        unreadCount: Number(data.unreadCount || previous.unreadCount || 0),
      }));
      setStatusMessage('Saved search settings updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update alert settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSearchEnabled = async (search) => {
    if (!search || !search._id) return;
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      await upsertMyInstantAlertSearch({
        searchId: search._id,
        name: search.name,
        enabled: !(search.enabled !== false),
        criteria: search.criteria || {},
        sourceContext: search.sourceContext || {},
      });
      await loadAlertsData();
      setStatusMessage('Saved search updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update saved search.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSearch = async (searchId) => {
    if (!searchId) return;
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      await deleteMyInstantAlertSearch(searchId);
      await loadAlertsData();
      setStatusMessage('Saved search deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete saved search.');
    } finally {
      setSaving(false);
    }
  };

  const markAlertRead = async (alertId, read) => {
    if (!alertId) return;
    try {
      await markMyInstantAlertReadState(alertId, read);
      await refreshInbox();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update alert status.');
    }
  };

  const inboxStats = useMemo(() => {
    const unread = inbox.filter((item) => !item.readAt).length;
    return { total: inbox.length, unread };
  }, [inbox]);

  return (
    <div className="alerts-page">
      <div className="alerts-card">
        <h2>Saved Search</h2>
        <p className="form-helper-text">
          Your filters and map circle are captured from your active search. Click "Save Search" in the header to save criteria without re-entering fields.
        </p>
        {loading && <p className="status-message">Loading your saved search preferences...</p>}
        {!loading && (
          <>
            {error && <p className="status-message status-message-error">{error}</p>}
            {statusMessage && <p className="status-message">{statusMessage}</p>}
            <div className="alerts-settings-row">
              <label>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => updateSettings({ enabled: event.target.checked })}
                  disabled={saving}
                />
                Enable saved search alerts
              </label>
              <label className="alerts-delivery-preference">
                <span>Notify via</span>
                <select
                  value={settings.deliveryPreference}
                  onChange={(event) => updateSettings({ deliveryPreference: event.target.value })}
                  disabled={saving}
                >
                  <option value="account">
                    Account preference ({formatDeliveryPreferenceLabel(settings.accountPreferredContactMethod)})
                  </option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </label>
            </div>
            <p className="alerts-meta-line">
              Inbox alerts: {inboxStats.total} total, {inboxStats.unread} unread
            </p>
            <p className="form-helper-text">
              Account contact preference: {formatDeliveryPreferenceLabel(settings.accountPreferredContactMethod)}.
            </p>
          </>
        )}
      </div>

      {!loading && (
        <div className="alerts-card">
          <div className="alerts-search-list">
            <h3>Saved criteria</h3>
            {savedSearches.length === 0 && (
              <p className="form-helper-text">No saved criteria yet. Apply filters on listings, then click "Save Search".</p>
            )}
            {savedSearches.map((search) => (
              <div key={search._id} className="alerts-search-item">
                <div>
                  <p><strong>{search.name}</strong> {search.enabled ? '' : '(Paused)'}</p>
                  <p className="alerts-search-item-details">
                    {summarizeSearchCriteria(search)}
                  </p>
                </div>
                <div className="alerts-search-item-actions">
                  <button type="button" className="secondary-btn" onClick={() => toggleSearchEnabled(search)} disabled={saving}>
                    {search.enabled ? 'Pause' : 'Resume'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => deleteSearch(search._id)} disabled={saving}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className="alerts-card">
          <h3>Alert inbox</h3>
          {inbox.length === 0 && <p className="form-helper-text">No matching apartment alerts yet.</p>}
          <div className="alerts-inbox-list">
            {inbox.map((item) => (
              <div key={item._id} className={`alerts-inbox-item ${item.readAt ? 'is-read' : 'is-unread'}`}>
                <div>
                  <p className="alerts-inbox-title">{item.message || 'Saved search match received.'}</p>
                  <p className="alerts-inbox-meta">
                    {item.propertySnapshot?.title || 'Listing'} •
                    {' '}
                    {item.propertySnapshot?.city || 'Israel'} •
                    {' '}
                    {item.propertySnapshot?.price ? `₪${Number(item.propertySnapshot.price).toLocaleString()}` : 'Price unavailable'} •
                    {' '}
                    {formatDeliveryPreferenceLabel(item.deliveryChannel)}
                  </p>
                </div>
                <div className="alerts-inbox-actions">
                  {!item.readAt ? (
                    <button type="button" className="secondary-btn" onClick={() => markAlertRead(item._id, true)}>
                      Mark read
                    </button>
                  ) : (
                    <button type="button" className="secondary-btn" onClick={() => markAlertRead(item._id, false)}>
                      Mark unread
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstantAlerts;

import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteMyInstantAlertSearch,
  getMyInstantAlertInbox,
  getMyInstantAlerts,
  markMyInstantAlertReadState,
  updateMyInstantAlertSettings,
  upsertMyInstantAlertSearch,
} from '../services/api';

const TYPE_OPTIONS = [
  { value: '', label: 'Any listing type' },
  { value: 'rental', label: 'Rental apartments' },
  { value: 'sale', label: 'For sale apartments' },
];

const ROOM_OPTIONS = [
  { value: '', label: 'Any bedrooms' },
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1 bedroom' },
  { value: '2', label: '2 bedrooms' },
  { value: '3', label: '3 bedrooms' },
  { value: '4+', label: '4+ bedrooms' },
];

const BATH_OPTIONS = [
  { value: '', label: 'Any bathrooms' },
  { value: '1', label: '1 bathroom' },
  { value: '2', label: '2 bathrooms' },
  { value: '3+', label: '3+ bathrooms' },
];

const emptySearchForm = {
  searchId: '',
  name: '',
  enabled: true,
  criteria: {
    type: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    rooms: '',
    baths: '',
  },
};

const toInputNumber = (value) => {
  if (value == null || value === '') return '';
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? String(asNumber) : '';
};

const InstantAlerts = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [settings, setSettings] = useState({
    enabled: false,
    deliverInApp: true,
    deliverEmail: false,
    unreadCount: 0,
  });
  const [savedSearches, setSavedSearches] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [searchForm, setSearchForm] = useState(emptySearchForm);

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
        deliverInApp: alertData.deliverInApp !== false,
        deliverEmail: alertData.deliverEmail === true,
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
        deliverInApp: data.deliverInApp !== false,
        deliverEmail: data.deliverEmail === true,
        unreadCount: Number(data.unreadCount || previous.unreadCount || 0),
      }));
      setStatusMessage('Instant alert settings updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update alert settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchInput = (field, value) => {
    setSearchForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCriteriaInput = (field, value) => {
    setSearchForm((prev) => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [field]: value,
      },
    }));
  };

  const submitSearch = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      const payload = {
        searchId: searchForm.searchId || undefined,
        name: searchForm.name,
        enabled: searchForm.enabled,
        criteria: {
          ...searchForm.criteria,
          minPrice: toInputNumber(searchForm.criteria.minPrice),
          maxPrice: toInputNumber(searchForm.criteria.maxPrice),
        },
      };
      await upsertMyInstantAlertSearch(payload);
      setSearchForm(emptySearchForm);
      await loadAlertsData();
      setStatusMessage('Instant alert search saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save instant alert search.');
    } finally {
      setSaving(false);
    }
  };

  const startEditingSearch = (search) => {
    setSearchForm({
      searchId: search._id,
      name: search.name || '',
      enabled: search.enabled !== false,
      criteria: {
        type: search.criteria?.type || '',
        city: search.criteria?.city || '',
        minPrice: toInputNumber(search.criteria?.minPrice),
        maxPrice: toInputNumber(search.criteria?.maxPrice),
        rooms: search.criteria?.rooms || '',
        baths: search.criteria?.baths || '',
      },
    });
    setStatusMessage('');
    setError('');
  };

  const deleteSearch = async (searchId) => {
    if (!searchId) return;
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      await deleteMyInstantAlertSearch(searchId);
      if (searchForm.searchId === searchId) {
        setSearchForm(emptySearchForm);
      }
      await loadAlertsData();
      setStatusMessage('Instant alert search deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete instant alert search.');
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
        <h2>Instant Alerts</h2>
        <p className="form-helper-text">
          Opt in to instant apartment alerts and define the exact criteria you want.
        </p>
        {loading && <p className="status-message">Loading your alert preferences…</p>}
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
                Enable instant alerts
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.deliverInApp}
                  onChange={(event) => updateSettings({ deliverInApp: event.target.checked })}
                  disabled={saving}
                />
                Deliver in-app
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.deliverEmail}
                  onChange={(event) => updateSettings({ deliverEmail: event.target.checked })}
                  disabled={saving}
                />
                Email-ready setting
              </label>
            </div>
            <p className="alerts-meta-line">
              Inbox alerts: {inboxStats.total} total, {inboxStats.unread} unread
            </p>
          </>
        )}
      </div>

      {!loading && (
        <div className="alerts-card">
          <h3>{searchForm.searchId ? 'Edit alert criteria' : 'Add alert criteria'}</h3>
          <form onSubmit={submitSearch} className="alerts-form-grid">
            <div className="input-field">
              <label>Alert name</label>
              <input
                type="text"
                value={searchForm.name}
                onChange={(event) => handleSearchInput('name', event.target.value)}
                placeholder="Tel Aviv rentals under 10,000"
                required
              />
            </div>
            <div className="input-field">
              <label>Listing type</label>
              <select
                value={searchForm.criteria.type}
                onChange={(event) => handleCriteriaInput('type', event.target.value)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'all-types'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-field">
              <label>City</label>
              <input
                type="text"
                value={searchForm.criteria.city}
                onChange={(event) => handleCriteriaInput('city', event.target.value)}
                placeholder="Tel Aviv"
              />
            </div>
            <div className="input-field">
              <label>Minimum price (₪)</label>
              <input
                type="number"
                min="0"
                value={searchForm.criteria.minPrice}
                onChange={(event) => handleCriteriaInput('minPrice', event.target.value)}
              />
            </div>
            <div className="input-field">
              <label>Maximum price (₪)</label>
              <input
                type="number"
                min="0"
                value={searchForm.criteria.maxPrice}
                onChange={(event) => handleCriteriaInput('maxPrice', event.target.value)}
              />
            </div>
            <div className="input-field">
              <label>Bedrooms</label>
              <select
                value={searchForm.criteria.rooms}
                onChange={(event) => handleCriteriaInput('rooms', event.target.value)}
              >
                {ROOM_OPTIONS.map((option) => (
                  <option key={option.value || 'any-bedrooms'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-field">
              <label>Bathrooms</label>
              <select
                value={searchForm.criteria.baths}
                onChange={(event) => handleCriteriaInput('baths', event.target.value)}
              >
                {BATH_OPTIONS.map((option) => (
                  <option key={option.value || 'any-bathrooms'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="alerts-inline-toggle">
              <input
                type="checkbox"
                checked={searchForm.enabled}
                onChange={(event) => handleSearchInput('enabled', event.target.checked)}
              />
              Keep this criteria active
            </label>
            <div className="alerts-form-actions">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Saving…' : (searchForm.searchId ? 'Update Criteria' : 'Save Criteria')}
              </button>
              {searchForm.searchId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSearchForm(emptySearchForm)}
                  disabled={saving}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
          <div className="alerts-search-list">
            <h4>Saved criteria</h4>
            {savedSearches.length === 0 && (
              <p className="form-helper-text">No criteria saved yet.</p>
            )}
            {savedSearches.map((search) => (
              <div key={search._id} className="alerts-search-item">
                <div>
                  <p><strong>{search.name}</strong> {search.enabled ? '' : '(Paused)'}</p>
                  <p className="alerts-search-item-details">
                    {search.criteria?.type ? `Type: ${search.criteria.type}` : 'Type: any'} •
                    {' '}
                    {search.criteria?.city ? `City: ${search.criteria.city}` : 'City: any'} •
                    {' '}
                    {search.criteria?.minPrice ? `Min ₪${Number(search.criteria.minPrice).toLocaleString()}` : 'Min: none'} •
                    {' '}
                    {search.criteria?.maxPrice ? `Max ₪${Number(search.criteria.maxPrice).toLocaleString()}` : 'Max: none'}
                  </p>
                </div>
                <div className="alerts-search-item-actions">
                  <button type="button" className="secondary-btn" onClick={() => startEditingSearch(search)} disabled={saving}>
                    Edit
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
                  <p className="alerts-inbox-title">{item.message || 'Apartment alert received.'}</p>
                  <p className="alerts-inbox-meta">
                    {item.propertySnapshot?.title || 'Listing'} •
                    {' '}
                    {item.propertySnapshot?.city || 'Israel'} •
                    {' '}
                    {item.propertySnapshot?.price ? `₪${Number(item.propertySnapshot.price).toLocaleString()}` : 'Price unavailable'}
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

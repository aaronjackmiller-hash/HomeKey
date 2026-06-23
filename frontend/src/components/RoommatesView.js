/**
 * RoommatesView.js
 *
 * The full roommates experience, rendered inside PropertyList when
 * `isRoommatesView` is true (i.e. /?type=roommates is active).
 *
 * Designed for future extraction to /roommates as a standalone route.
 * When that day comes: move this file to RoommatesPage.js, wrap it in
 * a <Route path="/roommates">, and delete the conditional in PropertyList.
 *
 * Tabs:
 *   - Browse Rooms  → searcher view: listing cards + demand heatmap
 *   - List a Room   → landlord view: CTA for wizard + demand heatmap
 *
 * Stats banner (above tabs):
 *   - "X rooms available"  → derived from filtered roommate listings
 *   - "Y people searching" → TODO: wire to GET /api/roommates/searcher-count
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { getPropertyId } from '../utils/propertyIdentity';
import { getLocalizedAddress } from '../utils/addressLocalization';
import { toggleFavoriteProperty, incrementHeartClickCount } from '../utils/propertyInterest';
import { logRoommateDemandSignal } from '../utils/logRoommateDemand';
import { getRoommateStats, getRoommateListings } from '../services/api';
import RoommateWizard from './RoommateWizard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOMMATES_TAB = Object.freeze({
  BROWSE: 'browse',
  LIST: 'list',
});

// Fetches live stats from GET /api/roommates/stats
const fetchSearcherCount = async () => {
  try {
    const data = await getRoommateStats();
    return typeof data.searcherCount === 'number' ? data.searcherCount : null;
  } catch (_err) {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatPill = ({ icon, value, label, accent }) => (
  <div className={`roommates-stat-pill ${accent ? 'roommates-stat-pill--accent' : ''}`}>
    <span className="roommates-stat-pill-icon" aria-hidden="true">{icon}</span>
    <span className="roommates-stat-pill-value">
      {value != null ? value.toLocaleString() : '—'}
    </span>
    <span className="roommates-stat-pill-label">{label}</span>
  </div>
);

/**
 * Single roommate listing card.
 * useHistory is called here at the top level of this component — correctly.
 */
const RoommateCard = ({
  property,
  isFavorite,
  isMobile,
  language,
  locale,
  onFavoriteToggle,
  t,
}) => {
  const history = useHistory();
  const propertyId = getPropertyId(property);
  const canOpen = Boolean(propertyId) && !property.isHistoricalMatch;

  const localizedAddress = getLocalizedAddress(property?.address, language);
  const city = String(localizedAddress.city || '').trim();
  const neighborhood = String(localizedAddress.neighborhood || '').trim();
  const street = String(localizedAddress.street || '').trim();
  const streetNumber = String(localizedAddress.streetNumber || '').trim();

  // Neighborhood is the primary heading — searchers think in neighborhoods
  // first ("I want Florentin"), not street addresses.
  const primaryHeading = neighborhood
    ? [neighborhood, city].filter(Boolean).join(', ')
    : (city || t('propertyList.propertyListingFallback'));
  const streetLine = [street, streetNumber].filter(Boolean).join(' ');

  const images = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
  const hasMultiplePhotos = images.length > 1;
  // Roommate photos are uploaded directly to Cloudinary by RoommateWizard —
  // they're never Yad2-sourced, so there's no cropping utility to run them
  // through. Use the URL as-is; only fall back to a placeholder when a
  // listing genuinely has no photos.
  const imageSrc = images[0] || `https://picsum.photos/seed/rm-${propertyId || 'x'}/800/600`;

  // Roommate listings store price as 'rentShare', not 'price' —
  // a separate schema from the Property collection.
  const price = Number(property.rentShare ?? property.price);
  const displayPrice = Number.isNaN(price)
    ? t('propertyList.priceUnavailable')
    : `₪${price.toLocaleString(locale)}`;

  const bedrooms = property.totalBedrooms ?? property.bedrooms ?? property.rooms ?? null;
  const bathrooms = property.totalBathrooms ?? property.bathrooms ?? null;
  const sizeSqm = property.sizeSqm ?? property.size ?? null;

  // "Available now" — true if the listing's available-from date is today or in the past.
  const isAvailableNow = (() => {
    if (!property.dateAvailable) return false;
    const parsed = new Date(property.dateAvailable);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getTime() <= Date.now();
  })();

  // Quick preference tags shown directly on the card so searchers can
  // filter compatibility before clicking in.
  const genderLabel = {
    'no-preference': 'No gender preference',
    men: 'Men only',
    women: 'Women only',
  }[property.genderPreference] || 'No gender preference';
  const smokingTag = property.lifestyle?.smoking === 'not-allowed' ? 'No smoking' : null;
  const amenityTags = Array.isArray(property.amenities) ? property.amenities.slice(0, 2) : [];
  const AMENITY_LABELS = {
    elevator: 'Elevator', parking: 'Parking', pets: 'Pets ok', 'disabled-access': 'Accessible',
    renovated: 'Renovated', furnished: 'Furnished', mamad: 'Mamad', oven: 'Oven',
    balcony: 'Balcony', stovetop: 'Stovetop', 'laundry-facilities': 'Laundry', 'in-unit-washer-dryer': 'W/D',
  };
  const quickTags = [
    genderLabel,
    smokingTag,
    ...amenityTags.map((a) => AMENITY_LABELS[a] || a),
  ].filter(Boolean).slice(0, 4);

  const handleCardClick = useCallback(() => {
    if (!canOpen) return;
    logRoommateDemandSignal(property);
    history.push(`/roommates/${propertyId}`);
  }, [canOpen, property, propertyId, history]);

  return (
    <div
      className={`roommate-card ${canOpen ? 'is-clickable' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: canOpen ? 'pointer' : 'default' }}
    >
      <div className="roommate-card-image-wrap">
        <img
          className="roommate-card-image"
          src={imageSrc}
          alt={primaryHeading}
        />

        {isAvailableNow && (
          <span className="roommate-card-available-badge">
            {t('roommates.availableNow') || 'Available now'}
          </span>
        )}

        {hasMultiplePhotos && (
          <span className="roommate-card-photo-dots" aria-hidden="true">
            {images.slice(0, 5).map((_, idx) => (
              <span key={idx} className={`roommate-card-photo-dot ${idx === 0 ? 'is-active' : ''}`} />
            ))}
          </span>
        )}

        <button
          type="button"
          className={`property-card-favorite-btn property-card-favorite-btn--card-overlay ${isFavorite ? 'is-active' : ''}`}
          aria-label={isFavorite
            ? t('propertyList.removeFavoriteFromListing')
            : t('propertyList.addFavoriteToListing')}
          aria-pressed={isFavorite}
          disabled={!propertyId}
          onClick={(e) => {
            e.stopPropagation();
            if (!propertyId) return;
            toggleFavoriteProperty(String(propertyId));
            incrementHeartClickCount();
            onFavoriteToggle?.();
          }}
        >
          <span className="property-heart-icon-wrap" aria-hidden="true">
            <svg className="property-heart-icon" viewBox="0 0 24 24" focusable="false">
              <path d="M12 21s-6.6-4.5-9.1-8.2C.8 9.5 1.5 5.8 4.5 4c2.2-1.3 5-.7 6.7 1.2L12 6l.8-.8c1.8-1.9 4.5-2.4 6.7-1.2 3 1.8 3.7 5.5 1.6 8.8C18.6 16.5 12 21 12 21Z" />
            </svg>
          </span>
        </button>
      </div>

      <div className="roommate-card-body">
        <div className="roommate-card-price-row">
          <p className="roommate-card-price" dir="ltr">
            {displayPrice}<span className="roommate-card-price-suffix">/{t('roommates.perMonthShort') || 'mo'}</span>
          </p>
        </div>

        <h3 className="roommate-card-title">{primaryHeading}</h3>
        {streetLine && <p className="roommate-card-location">{streetLine}</p>}

        {(bedrooms != null || bathrooms != null || sizeSqm != null) && (
          <p className="roommate-card-specs-line">
            {[
              bedrooms != null ? `${bedrooms} bed` : null,
              bathrooms != null ? `${bathrooms} bath` : null,
              sizeSqm != null ? `${sizeSqm} sqm` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {quickTags.length > 0 && (
          <div className="roommate-card-quick-tags">
            {quickTags.map((tag) => (
              <span key={tag} className="roommate-card-quick-tag">{tag}</span>
            ))}
          </div>
        )}

        <button
          type="button"
          className="roommate-card-cta"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          disabled={!canOpen}
        >
          {t('propertyList.viewDetails')} →
        </button>
      </div>
    </div>
  );
};

const BrowseEmptyState = ({ t }) => (
  <div className="roommates-empty-state">
    <div className="roommates-empty-icon" aria-hidden="true">🏠</div>
    <h3>{t('roommates.noRoomsTitle') || 'No rooms found'}</h3>
    <p>{t('roommates.noRoomsBody') || 'Try adjusting your filters or check back soon — new listings are added daily.'}</p>
  </div>
);

const ListARoomTab = ({ searcherCount, t, onStartWizard }) => (
  <div className="roommates-list-tab">
    <div className="roommates-list-hero">
      <div className="roommates-list-hero-copy">
        <h2 className="roommates-list-hero-title">
          {t('roommates.listHeroTitle') || 'Your room, their home.'}
        </h2>
        <p className="roommates-list-hero-body">
          {searcherCount != null
            ? (t('roommates.listHeroBodyWithCount') || `${searcherCount.toLocaleString()} people are actively looking for a room right now.`).replace('{count}', searcherCount.toLocaleString())
            : t('roommates.listHeroBody') || 'Thousands of people are actively looking for a room. List yours in minutes.'}
        </p>
      </div>

      <div className="roommates-list-steps">
        <div className="roommates-list-step">
          <span className="roommates-list-step-num" aria-hidden="true">1</span>
          <div>
            <strong>{t('roommates.step1Title') || 'Describe your space'}</strong>
            <p>{t('roommates.step1Body') || 'Room size, amenities, house rules — we guide you through it.'}</p>
          </div>
        </div>
        <div className="roommates-list-step">
          <span className="roommates-list-step-num" aria-hidden="true">2</span>
          <div>
            <strong>{t('roommates.step2Title') || 'Set your price'}</strong>
            <p>{t('roommates.step2Body') || 'See what similar rooms nearby are charging.'}</p>
          </div>
        </div>
        <div className="roommates-list-step">
          <span className="roommates-list-step-num" aria-hidden="true">3</span>
          <div>
            <strong>{t('roommates.step3Title') || 'Get matched'}</strong>
            <p>{t('roommates.step3Body') || 'Searchers in your area see your listing immediately.'}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="roommates-list-cta-btn"
        onClick={onStartWizard}
      >
        {t('roommates.listCtaButton') || 'List my room'}
      </button>

      <p className="roommates-list-disclaimer">
        {t('roommates.listDisclaimer') || 'Free to list. No account required to get started.'}
      </p>
    </div>

    <div className="roommates-list-demand-note">
      <h3>{t('roommates.demandNoteTitle') || 'Where demand is highest'}</h3>
      <p>{t('roommates.demandNoteBody') || 'The heatmap shows where searchers are most actively looking. Darker areas = more demand.'}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const RoommatesView = ({
  favoriteIdSet = new Set(),
  isMobileViewport = false,
  language = 'en',
  locale = 'en-US',
  onFavoriteToggle,
  onListingsChange,
  t,
}) => {
  // useHistory called here at the top level of RoommatesView — correct placement
  const history = useHistory();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(ROOMMATES_TAB.BROWSE);
  const [searcherCount, setSearcherCount] = useState(null);
  const [searcherCountLoading, setSearcherCountLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Roommate listings now come from the dedicated /api/roommates collection —
  // NOT from the Property collection used by Rent/Sale. This fixes the bug
  // where Browse Rooms always showed "0" even after listings were published.
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshListings = useCallback(() => {
    let cancelled = false;
    setLoading(true);

    // Read the same filter params the Navbar writes for Roommates mode —
    // city (q), rooms (-> bedrooms), baths (-> bathrooms), availableFrom.
    const params = new URLSearchParams(location.search);
    const city = String(params.get('q') || '').trim();
    const roomsParam = String(params.get('rooms') || '').trim();
    const bathsParam = String(params.get('baths') || '').trim();
    const availableFromParam = String(params.get('availableFrom') || '').trim();

    // "4+" style values mean "at least N" — the backend filter does an
    // exact match, so for now we send the leading digit. A future
    // enhancement could add $gte support server-side for "+" values.
    const toExactCount = (value) => {
      const digitsOnly = value.replace(/\+$/, '');
      const parsed = Number(digitsOnly);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    const apiParams = {};
    if (city) apiParams.city = city;
    const bedroomsCount = toExactCount(roomsParam);
    if (bedroomsCount !== undefined) apiParams.bedrooms = bedroomsCount;
    const bathroomsCount = toExactCount(bathsParam);
    if (bathroomsCount !== undefined) apiParams.bathrooms = bathroomsCount;
    if (/^\d{4}-\d{2}-\d{2}$/.test(availableFromParam)) apiParams.availableFrom = availableFromParam;

    getRoommateListings(apiParams)
      .then((data) => {
        if (cancelled) return;
        const nextListings = Array.isArray(data?.data) ? data.data : [];
        setListings(nextListings);
        if (typeof onListingsChange === 'function') onListingsChange(nextListings);
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [location.search]);

  useEffect(() => {
    const cleanup = refreshListings();
    return cleanup;
  }, [refreshListings]);

  useEffect(() => {
    let cancelled = false;
    setSearcherCountLoading(true);
    fetchSearcherCount()
      .then((count) => {
        if (!cancelled) setSearcherCount(typeof count === 'number' ? count : null);
      })
      .catch(() => {
        if (!cancelled) setSearcherCount(null);
      })
      .finally(() => {
        if (!cancelled) setSearcherCountLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const displayProperties = listings;
  const availableRoomsCount = displayProperties.length;

  const handleStartWizard = useCallback(() => {
    setWizardOpen(true);
  }, []);

  const handleCloseWizard = useCallback(() => {
    setWizardOpen(false);
    // Refresh listings and stats in case a new one was just published
    refreshListings();
    fetchSearcherCount().then((count) => {
      setSearcherCount(typeof count === 'number' ? count : null);
    });
    setActiveTab(ROOMMATES_TAB.BROWSE);
  }, [refreshListings]);

  const tabLabel = (tab) =>
    tab === ROOMMATES_TAB.BROWSE
      ? (t('roommates.tabBrowse') || 'Browse Rooms')
      : (t('roommates.tabList') || 'List a Room');

  return (
    <div className="roommates-view">
      {wizardOpen && <RoommateWizard onClose={handleCloseWizard} />}
      <div className="roommates-stats-banner" aria-label={t('roommates.statsBannerAriaLabel') || 'Roommate market overview'}>
        <StatPill
          icon="🏠"
          value={loading ? null : availableRoomsCount}
          label={t('roommates.statRoomsAvailable') || 'rooms available'}
        />
        <div className="roommates-stats-divider" aria-hidden="true" />
        <StatPill
          icon="🔍"
          value={searcherCountLoading ? null : searcherCount}
          label={t('roommates.statPeopleSearching') || 'people searching'}
          accent
        />
      </div>

      <div
        className="roommates-tab-strip"
        role="tablist"
        aria-label={t('roommates.tabStripAriaLabel') || 'Roommate sections'}
      >
        {[ROOMMATES_TAB.BROWSE, ROOMMATES_TAB.LIST].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`roommates-tab-btn ${activeTab === tab ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabel(tab)}
            {tab === ROOMMATES_TAB.BROWSE && !loading && availableRoomsCount > 0 && (
              <span className="roommates-tab-count" aria-label={`${availableRoomsCount} rooms`}>
                {availableRoomsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        aria-label={tabLabel(activeTab)}
        className="roommates-tab-panel"
      >
        {activeTab === ROOMMATES_TAB.BROWSE && (
          <div className="roommates-browse-tab">
            {!loading && availableRoomsCount > 0 && (
              <p className="roommates-tab-stat">
                {availableRoomsCount.toLocaleString(locale)}{' '}
                {t('roommates.browseTabStat') || 'rooms available right now'}
              </p>
            )}
            {loading && <p className="status-message">{t('propertyList.loadingProperties')}</p>}
            {!loading && availableRoomsCount === 0 && <BrowseEmptyState t={t} />}
            {!loading && availableRoomsCount > 0 && (
              <div className="roommates-card-grid">
                {displayProperties.map((property, index) => {
                  if (!property || typeof property !== 'object') return null;
                  const propertyId = getPropertyId(property);
                  const key = propertyId || `roommate-${index}`;
                  const isFavorite = propertyId ? favoriteIdSet.has(String(propertyId)) : false;
                  return (
                    <RoommateCard
                      key={key}
                      property={property}
                      isFavorite={isFavorite}
                      isMobile={isMobileViewport}
                      language={language}
                      locale={locale}
                      onFavoriteToggle={onFavoriteToggle}
                      t={t}
                    />
                  );
                })}
              </div>
            )}
            <p className="roommates-heatmap-note">
              {t('roommates.heatmapNote') || 'Heatmap shows where rooms are being searched most — updated as people browse.'}
            </p>
          </div>
        )}

        {activeTab === ROOMMATES_TAB.LIST && (
          <ListARoomTab
            searcherCount={searcherCount}
            t={t}
            onStartWizard={handleStartWizard}
          />
        )}
      </div>
    </div>
  );
};

export default RoommatesView;

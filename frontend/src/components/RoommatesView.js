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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { getPropertyId } from '../utils/propertyIdentity';
import { getLocalizedAddress } from '../utils/addressLocalization';
import { buildYad2TopCroppedImageUrl } from '../utils/yad2ImageCrop';
import { toggleFavoriteProperty, incrementHeartClickCount } from '../utils/propertyInterest';
import { logRoommateDemandSignal } from '../utils/logRoommateDemand';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOMMATES_TAB = Object.freeze({
  BROWSE: 'browse',
  LIST: 'list',
});

// TODO: replace with real API call to GET /api/roommates/searcher-count
// Backend should return the rolling 7-day count of unique roommate searchers.
const fetchSearcherCount = async () => {
  // Stubbed — returns null so UI shows a graceful fallback
  return null;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Shared stat pill shown in the banner above the tabs.
 */
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
 * Clicking fires the demand signal then opens the property detail page.
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

  const locationLine = [neighborhood, city].filter(Boolean).join(', ');
  const displayTitle = street || locationLine || t('propertyList.propertyListingFallback');

  const imageSrc =
    buildYad2TopCroppedImageUrl(
      Array.isArray(property.images) ? property.images[0] : '',
      property.externalSource || property.sourceType
    ) || `https://picsum.photos/seed/rm-${propertyId || 'x'}/800/600`;

  const price = Number(property.price);
  const displayPrice = Number.isNaN(price)
    ? t('propertyList.priceUnavailable')
    : `₪${price.toLocaleString(locale)}`;

  const bedrooms = property.bedrooms ?? property.rooms ?? null;
  const bathrooms = property.bathrooms ?? property.baths ?? null;

  const handleCardClick = useCallback(() => {
    if (!canOpen) return;
    logRoommateDemandSignal(property);
    history.push(`/properties/${propertyId}`, { previewProperty: property });
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
          alt={displayTitle}
        />
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
        <p className="roommate-card-price" dir="ltr">{displayPrice}</p>
        <h3 className="roommate-card-title">{displayTitle}</h3>
        {locationLine && locationLine !== displayTitle && (
          <p className="roommate-card-location">{locationLine}</p>
        )}

        <div className="roommate-card-stats">
          {bedrooms != null && (
            <span className="roommate-card-stat">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3.5 12v5M20.5 12v5M3.5 14.5h17M5.5 12V9.8A1.8 1.8 0 0 1 7.3 8h4.9A1.8 1.8 0 0 1 14 9.8V12M14 12V9.8A1.8 1.8 0 0 1 15.8 8h.9a1.8 1.8 0 0 1 1.8 1.8V12" />
              </svg>
              {bedrooms} {t('propertyList.beds')}
            </span>
          )}
          {bathrooms != null && (
            <span className="roommate-card-stat">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12h14v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM8 12V9.5A2.5 2.5 0 0 1 10.5 7h2A1.5 1.5 0 0 1 14 8.5v0A1.5 1.5 0 0 1 12.5 10H11M7.5 19v1.5M16.5 19v1.5" />
              </svg>
              {bathrooms} {t('propertyList.baths')}
            </span>
          )}
          {property.size != null && (
            <span className="roommate-card-stat">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 5h5v2H7v3H5zM14 5h5v5h-2V7h-3zM5 14h2v3h3v2H5zM17 17v-3h2v5h-5v-2z" />
              </svg>
              {property.size} {t('propertyList.sqm')}
            </span>
          )}
        </div>

        <button
          type="button"
          className="roommate-card-cta"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          disabled={!canOpen}
        >
          {t('propertyList.viewDetails')}
        </button>
      </div>
    </div>
  );
};

/**
 * Empty state shown when Browse Rooms has no results.
 */
const BrowseEmptyState = ({ t }) => (
  <div className="roommates-empty-state">
    <div className="roommates-empty-icon" aria-hidden="true">🏠</div>
    <h3>{t('roommates.noRoomsTitle') || 'No rooms found'}</h3>
    <p>{t('roommates.noRoomsBody') || 'Try adjusting your filters or check back soon — new listings are added daily.'}</p>
  </div>
);

/**
 * The "List a Room" tab content — landlord-facing CTA.
 * The wizard is wired up later; this is the entry point.
 */
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

/**
 * RoommatesView
 *
 * Props:
 *   displayProperties  {object[]}  — already-filtered roommate listings
 *   favoriteIdSet      {Set}       — set of favorited property ID strings
 *   isMobileViewport   {boolean}
 *   language           {string}
 *   locale             {string}
 *   loading            {boolean}
 *   onFavoriteToggle   {function}  — triggers parent interestVersion bump
 *   t                  {function}  — i18n translation function
 */
const RoommatesView = ({
  displayProperties = [],
  favoriteIdSet = new Set(),
  isMobileViewport = false,
  language = 'en',
  locale = 'en-US',
  loading = false,
  onFavoriteToggle,
  t,
}) => {
  const [activeTab, setActiveTab] = useState(ROOMMATES_TAB.BROWSE);
  const [searcherCount, setSearcherCount] = useState(null);
  const [searcherCountLoading, setSearcherCountLoading] = useState(true);

  // Fetch rolling searcher count once on mount
  useEffect(() => {
    let cancelled = false;
    setSearcherCountLoading(true);
    fetchSearcherCount()
      .then((count) => {
        if (!cancelled) {
          setSearcherCount(typeof count === 'number' ? count : null);
        }
      })
      .catch(() => {
        if (!cancelled) setSearcherCount(null);
      })
      .finally(() => {
        if (!cancelled) setSearcherCountLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const availableRoomsCount = displayProperties.length;

  // TODO: wire to wizard entry point when wizard is built
  const handleStartWizard = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('homekey:open-list-room-wizard'));
    }
  }, []);

  const tabLabel = (tab) =>
    tab === ROOMMATES_TAB.BROWSE
      ? (t('roommates.tabBrowse') || 'Browse Rooms')
      : (t('roommates.tabList') || 'List a Room');

  return (
    <div className="roommates-view">

      {/* ── Stats banner ─────────────────────────────────────────── */}
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

      {/* ── Tab strip ────────────────────────────────────────────── */}
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

      {/* ── Tab panels ───────────────────────────────────────────── */}
      <div
        role="tabpanel"
        aria-label={tabLabel(activeTab)}
        className="roommates-tab-panel"
      >
        {activeTab === ROOMMATES_TAB.BROWSE && (
          <div className="roommates-browse-tab">
            {/* Tab-specific stat */}
            {!loading && availableRoomsCount > 0 && (
              <p className="roommates-tab-stat">
                {availableRoomsCount.toLocaleString(locale)}{' '}
                {t('roommates.browseTabStat') || 'rooms available right now'}
              </p>
            )}

            {/* Listing cards */}
            {loading && (
              <p className="status-message">{t('propertyList.loadingProperties')}</p>
            )}

            {!loading && availableRoomsCount === 0 && (
              <BrowseEmptyState t={t} />
            )}

            {!loading && availableRoomsCount > 0 && (
              <div className="roommates-card-grid">
                {displayProperties.map((property, index) => {
                  if (!property || typeof property !== 'object') return null;
                  const propertyId = getPropertyId(property);
                  const key = propertyId || `roommate-${index}`;
                  const isFavorite = propertyId
                    ? favoriteIdSet.has(String(propertyId))
                    : false;

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

            {/* Heatmap explainer (visible when map is present) */}
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


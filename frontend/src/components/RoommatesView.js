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
import { getRoommateListings, getSeekerProfiles } from '../services/api';
import RoommateWizard from './RoommateWizard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOMMATES_TAB = Object.freeze({
  BROWSE: 'browse',
  LIST: 'list',
  LOOKING: 'looking',
});

// Fetches the live count of people looking for a room.
const fetchSearcherCount = async () => {
  try {
    const data = await getSeekerProfiles({ limit: 1 });
    return typeof data.count === 'number' ? data.count : null;
  } catch (_err) {
    return null;
  }
};

const fetchSeekerProfiles = async () => {
  const data = await getSeekerProfiles();
  return Array.isArray(data?.data) ? data.data : [];
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

  const primaryHeading = neighborhood
    ? [neighborhood, city].filter(Boolean).join(', ')
    : (city || t('propertyList.propertyListingFallback'));
  const streetLine = [street, streetNumber].filter(Boolean).join(' ');

  const images = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
  const imageSrc = images[0] || `https://picsum.photos/seed/rm-${propertyId || 'x'}/800/600`;

  const price = Number(property.rentShare ?? property.price);
  const displayPrice = Number.isNaN(price)
    ? t('propertyList.priceUnavailable')
    : `₪${price.toLocaleString(locale)}`;

  const bedrooms = property.totalBedrooms ?? property.bedrooms ?? property.rooms ?? null;
  const bathrooms = property.totalBathrooms ?? property.bathrooms ?? null;
  const sizeSqm = property.sizeSqm ?? property.size ?? null;

  const isAvailableNow = (() => {
    if (!property.dateAvailable) return false;
    const parsed = new Date(property.dateAvailable);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getTime() <= Date.now();
  })();

  // WhatsApp link using the lister's phone number
  const rawPhone = String(property.contact?.phone || '').replace(/[^\d]/g, '').replace(/^0/, '972');
  const whatsappHref = rawPhone.length >= 7
    ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(`Hi, I saw your room on HomeKey and I'm interested.`)}`
    : '';

  // Lifestyle tags — unique to roommate cards
  const smokingTag = property.lifestyle?.smoking === 'not-allowed' ? 'No smoking'
    : property.lifestyle?.smoking === 'outside-only' ? 'Smoking outside' : null;
  const genderTag = property.genderPreference === 'men' ? 'Men only'
    : property.genderPreference === 'women' ? 'Women only' : null;
  const AMENITY_LABELS = {
    elevator: 'Elevator', parking: 'Parking', pets: 'Pets ok', renovated: 'Renovated',
    furnished: 'Furnished', mamad: 'Mamad', balcony: 'Balcony',
  };
  const amenityTags = Array.isArray(property.amenities)
    ? property.amenities.slice(0, 2).map((a) => AMENITY_LABELS[a]).filter(Boolean)
    : [];
  const quickTags = [smokingTag, genderTag, ...amenityTags].filter(Boolean).slice(0, 4);

  const handleCardClick = useCallback(() => {
    if (!canOpen) return;
    logRoommateDemandSignal(property);
    history.push(`/roommates/${propertyId}`);
  }, [canOpen, property, propertyId, history]);

  return (
    <div
      className={`property-card roommate-card ${canOpen ? 'is-clickable' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: canOpen ? 'pointer' : 'default' }}
    >
      <div className="property-card-body">
        {/* Text — left column, same as Rent/Sale */}
        <div className="property-card-text-stack">
          <p className={`property-card-price ${language === 'he' ? 'property-card-price--hebrew' : ''}`} dir="ltr">
            {displayPrice}<span className="roommate-price-suffix">/mo</span>
          </p>
          <h3 className="property-card-title property-card-title--street">{primaryHeading}</h3>
          {streetLine && <p className="property-card-location">{streetLine}</p>}
        </div>

        {/* Image — right column, framed exactly like Rent/Sale */}
        <div className="property-card-image-wrap property-card-image-wrap--framed">
          <img
            className="property-card-image"
            src={imageSrc}
            alt={primaryHeading}
          />
          {isAvailableNow && (
            <span className="roommate-card-available-badge">
              {t('roommates.availableNow') || 'Available now'}
            </span>
          )}
          <button
            type="button"
            className={`property-card-favorite-btn property-card-favorite-btn--card-overlay ${isFavorite ? 'is-active' : ''}`}
            aria-label={isFavorite ? t('propertyList.removeFavoriteFromListing') : t('propertyList.addFavoriteToListing')}
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

        {/* Stats row — same black pills as Rent/Sale */}
        <div className="property-card-stats" aria-label={t('propertyList.propertyHighlights')}>
          {bedrooms != null && (
            <span className="property-card-stat">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3.5 12v5M20.5 12v5M3.5 14.5h17M5.5 12V9.8A1.8 1.8 0 0 1 7.3 8h4.9A1.8 1.8 0 0 1 14 9.8V12M14 12V9.8A1.8 1.8 0 0 1 15.8 8h.9a1.8 1.8 0 0 1 1.8 1.8V12" />
              </svg>
              <span>{bedrooms} {t('propertyList.beds')}</span>
            </span>
          )}
          {bathrooms != null && (
            <span className="property-card-stat">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12h14v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
                <path d="M8 12V9.5A2.5 2.5 0 0 1 10.5 7h2A1.5 1.5 0 0 1 14 8.5v0A1.5 1.5 0 0 1 12.5 10H11" />
                <path d="M7.5 19v1.5M16.5 19v1.5" />
              </svg>
              <span>{bathrooms} {t('propertyList.baths')}</span>
            </span>
          )}
          {sizeSqm != null && (
            <span className="property-card-stat">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 5h5v2H7v3H5z" />
                <path d="M14 5h5v5h-2V7h-3z" />
                <path d="M5 14h2v3h3v2H5z" />
                <path d="M17 17v-3h2v5h-5v-2z" />
              </svg>
              <span>{sizeSqm} {t('propertyList.sqm')}</span>
            </span>
          )}
        </div>

        {/* Lifestyle tags — roommate-specific, teal pills */}
        {quickTags.length > 0 && (
          <div className="roommate-card-quick-tags">
            {quickTags.map((tag) => (
              <span key={tag} className="roommate-card-quick-tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Actions — same layout as Rent/Sale */}
        <div className="property-card-actions">
          <button
            type="button"
            className={`property-card-action-btn ${isMobile ? 'property-card-action-btn--primary-mobile' : 'property-card-action-btn--outline'}`}
            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
            disabled={!canOpen}
          >
            {t('propertyList.viewDetails')}
          </button>
          {!isMobile && whatsappHref && (
            <button
              type="button"
              className="property-card-action-btn property-card-action-btn--whatsapp"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof window !== 'undefined') window.open(whatsappHref, '_blank', 'noopener,noreferrer');
              }}
            >
              {t('propertyList.whatsapp')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── SeekerCard — displays one person looking for a room ─────────────────────
const SeekerCard = ({ profile }) => {
  const budgetParts = [];
  if (profile.budgetMin > 0) budgetParts.push(`₪${profile.budgetMin.toLocaleString()}`);
  if (profile.budgetMax) budgetParts.push(`₪${profile.budgetMax.toLocaleString()}`);
  const budgetDisplay = budgetParts.length === 2
    ? `${budgetParts[0]} – ${budgetParts[1]}/mo`
    : budgetParts.length === 1
      ? `Up to ${budgetParts[0]}/mo`
      : 'Flexible budget';

  const location = [
    profile.locationPreference?.neighborhood,
    profile.locationPreference?.city,
  ].filter(Boolean).join(', ') || 'Anywhere in Israel';

  const moveIn = profile.moveInDate
    ? new Date(profile.moveInDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Flexible';

  const tags = [
    profile.bedroomsNeeded ? `${profile.bedroomsNeeded} bed` : null,
    profile.genderPreference === 'women' ? 'Women only' : profile.genderPreference === 'men' ? 'Men only' : null,
    profile.lifestyle?.smoking === 'anywhere' ? 'Smoking ok' : profile.lifestyle?.smoking === 'outside-only' ? 'Smoking outside' : null,
    profile.lifestyle?.kosherKitchen === 'yes' ? 'Kosher kitchen' : null,
  ].filter(Boolean);

  const avatarLetter = (profile.firstName || '?')[0].toUpperCase();

  return (
    <div className="seeker-card">
      <div className="seeker-card__header">
        <div className="seeker-card__avatar">{avatarLetter}</div>
        <div className="seeker-card__identity">
          <h3 className="seeker-card__name">{profile.firstName || 'Anonymous'}</h3>
          <p className="seeker-card__location">{location}</p>
        </div>
      </div>

      <p className="seeker-card__budget">{budgetDisplay}</p>
      <p className="seeker-card__movein">Available from {moveIn}</p>

      {tags.length > 0 && (
        <div className="seeker-card__tags">
          {tags.map((tag) => (
            <span key={tag} className="seeker-card__tag">{tag}</span>
          ))}
        </div>
      )}

      {profile.whatsappHref && (
        <a
          href={profile.whatsappHref}
          className="seeker-card__cta"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Contact on WhatsApp
        </a>
      )}
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
            ? (t('roommates.listHeroBodyWithCount') || `${searcherCount.toLocaleString()} people have posted seeker profiles looking for a room right now.`).replace('{count}', searcherCount.toLocaleString())
            : t('roommates.listHeroBody') || 'People are actively looking for a room. List yours in minutes.'}
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

  // Roommate listings (rooms available)
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Seeker profiles (people looking for a room) — loaded when LOOKING tab is opened
  const [seekerProfiles, setSeekerProfiles] = useState([]);
  const [seekerProfilesLoading, setSeekerProfilesLoading] = useState(false);

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

  const refreshSearcherCount = useCallback(() => {
    setSearcherCountLoading(true);
    return fetchSearcherCount()
      .then((count) => setSearcherCount(typeof count === 'number' ? count : null))
      .catch(() => {
        setSearcherCount(null);
      })
      .finally(() => {
        setSearcherCountLoading(false);
      });
  }, []);

  const refreshSeekerProfiles = useCallback(() => {
    setSeekerProfilesLoading(true);
    return fetchSeekerProfiles()
      .then((profiles) => {
        setSeekerProfiles(profiles);
      })
      .catch(() => {
        setSeekerProfiles([]);
      })
      .finally(() => {
        setSeekerProfilesLoading(false);
      });
  }, []);

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
  const roomsAvailableLabel = availableRoomsCount === 1
    ? (t('roommates.statRoomAvailable') || 'room available')
    : (t('roommates.statRoomsAvailable') || 'rooms available');
  const peopleLookingLabel = searcherCount === 1
    ? (t('roommates.statPersonLooking') || 'person looking')
    : (t('roommates.statPeopleLooking') || 'people looking');

  // Switch to Browse tab when seeker publishes profile and clicks "Browse available rooms"
  useEffect(() => {
    const handleBrowseRooms = () => setActiveTab(ROOMMATES_TAB.BROWSE);
    window.addEventListener('homekey:browse-rooms', handleBrowseRooms);
    return () => window.removeEventListener('homekey:browse-rooms', handleBrowseRooms);
  }, []);

  useEffect(() => {
    const handleSeekerProfilePublished = () => {
      refreshSearcherCount();
      if (activeTab === ROOMMATES_TAB.LOOKING) {
        refreshSeekerProfiles();
      }
    };
    window.addEventListener('homekey:seeker-profile-published', handleSeekerProfilePublished);
    return () => window.removeEventListener('homekey:seeker-profile-published', handleSeekerProfilePublished);
  }, [activeTab, refreshSearcherCount, refreshSeekerProfiles]);

  // Fetch seeker profiles when the "People Looking" tab is activated
  useEffect(() => {
    if (activeTab !== ROOMMATES_TAB.LOOKING) return;
    refreshSeekerProfiles();
  }, [activeTab, refreshSeekerProfiles]);

  const handleStartWizard = useCallback(() => {
    setWizardOpen(true);
  }, []);

  const handleCloseWizard = useCallback(() => {
    setWizardOpen(false);
    // Refresh listings and stats in case a new one was just published
    refreshListings();
    refreshSearcherCount();
    setActiveTab(ROOMMATES_TAB.BROWSE);
  }, [refreshListings, refreshSearcherCount]);

  const tabLabel = (tab) => {
    if (tab === ROOMMATES_TAB.BROWSE) return t('roommates.tabBrowse') || 'Browse Rooms';
    if (tab === ROOMMATES_TAB.LIST) return t('roommates.tabList') || 'List a Room';
    if (tab === ROOMMATES_TAB.LOOKING) return 'Looking for a Room or Roommate';
    return tab;
  };

  return (
    <div className="roommates-view">
      {wizardOpen && <RoommateWizard onClose={handleCloseWizard} />}
      <div className="roommates-stats-banner" aria-label={t('roommates.statsBannerAriaLabel') || 'Roommate market overview'}>
        <StatPill
          icon="🏠"
          value={loading ? null : availableRoomsCount}
          label={roomsAvailableLabel}
        />
        <div className="roommates-stats-divider" aria-hidden="true" />
        <StatPill
          icon="🔍"
          value={searcherCountLoading ? null : searcherCount}
          label={peopleLookingLabel}
          accent
        />
      </div>

      {/* ── Hero tab cards — the primary navigation for the Roommates experience ── */}
      <div className="roommates-hero-tabs" role="tablist" aria-label={t('roommates.tabStripAriaLabel') || 'Roommate sections'}>

        {/* Browse Rooms */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === ROOMMATES_TAB.BROWSE}
          className={`roommates-hero-tab ${activeTab === ROOMMATES_TAB.BROWSE ? 'is-active' : ''}`}
          onClick={() => setActiveTab(ROOMMATES_TAB.BROWSE)}
        >
          <span className="roommates-hero-tab__icon" aria-hidden="true">🏠</span>
          <strong className="roommates-hero-tab__title">Browse Rooms</strong>
          <span className="roommates-hero-tab__desc">See all available rooms on the map</span>
          {!loading && availableRoomsCount > 0 && (
            <span className="roommates-hero-tab__badge">{availableRoomsCount} available</span>
          )}
        </button>

        {/* List a Room — HERO */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === ROOMMATES_TAB.LIST}
          className={`roommates-hero-tab roommates-hero-tab--hero ${activeTab === ROOMMATES_TAB.LIST ? 'is-active' : ''}`}
          onClick={() => setActiveTab(ROOMMATES_TAB.LIST)}
        >
          <span className="roommates-hero-tab__start-badge">⭐ Start Here</span>
          <span className="roommates-hero-tab__icon" aria-hidden="true">🔑</span>
          <strong className="roommates-hero-tab__title">List a Room</strong>
          <span className="roommates-hero-tab__desc">Post your room — reach thousands instantly</span>
          <span className="roommates-hero-tab__badge roommates-hero-tab__badge--white">Free · 2 minutes</span>
        </button>

        {/* Looking for a Room or Roommate */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === ROOMMATES_TAB.LOOKING}
          className={`roommates-hero-tab ${activeTab === ROOMMATES_TAB.LOOKING ? 'is-active' : ''}`}
          onClick={() => setActiveTab(ROOMMATES_TAB.LOOKING)}
        >
          <span className="roommates-hero-tab__icon" aria-hidden="true">🔍</span>
          <strong className="roommates-hero-tab__title">Looking for a Room or Roommate</strong>
          <span className="roommates-hero-tab__desc">Post your profile — listers contact you</span>
          {!searcherCountLoading && searcherCount != null && (
            <span className="roommates-hero-tab__badge">{searcherCount} active seekers</span>
          )}
        </button>

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

        {activeTab === ROOMMATES_TAB.LOOKING && (
          <div className="roommates-browse-tab roommates-looking-tab">
            {/* CTA for seekers to publish their own profile */}
            <div className="roommates-looking-cta-row">
              <div className="roommates-looking-cta-copy">
                <strong>Looking for a room?</strong>
                <span>Post your profile so room listers can find and contact you directly.</span>
              </div>
              <button
                type="button"
                className="roommates-looking-cta-btn"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('homekey:open-mobile-filters'));
                  }
                }}
              >
                Post my profile
              </button>
            </div>

            <p className="roommates-tab-stat">
              {seekerProfilesLoading
                ? 'Loading…'
                : seekerProfiles.length > 0
                  ? `${seekerProfiles.length} ${seekerProfiles.length === 1 ? 'person' : 'people'} looking for a room right now`
                  : 'No one is looking for a room yet — be the first to post your profile'}
            </p>
            {seekerProfilesLoading && (
              <p className="status-message">{t('propertyList.loadingProperties')}</p>
            )}
            {!seekerProfilesLoading && seekerProfiles.length === 0 && (
              <div className="roommates-empty-state">
                <div className="roommates-empty-icon" aria-hidden="true">🔍</div>
                <h3>No seekers listed yet</h3>
                <p>People looking for rooms will appear here.</p>
              </div>
            )}
            {!seekerProfilesLoading && seekerProfiles.length > 0 && (
              <div className="seeker-card-grid">
                {seekerProfiles.map((profile) => (
                  <SeekerCard key={profile._id} profile={profile} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoommatesView;

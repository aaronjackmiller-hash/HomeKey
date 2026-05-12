import React from 'react';
import './RealEstateInquiryBlueprint.css';

const SidebarIcon = ({ children, active = false, label }) => (
  <button
    type="button"
    className={`blueprint-nav-button${active ? ' is-active' : ''}`}
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const RealEstateInquiryBlueprint = () => {
  return (
    <div className="blueprint-shell">
      <div className="blueprint-map-layer" aria-hidden="true" />
      <div className="blueprint-map-overlay" aria-hidden="true" />

      <aside className="blueprint-sidebar" aria-label="Primary tools">
        <div className="blueprint-sidebar-group">
          <SidebarIcon label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <line x1="16" y1="16" x2="21" y2="21" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Layers">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12 4 20 8.5 12 13 4 8.5 12 4" />
              <polyline points="4 12 12 16.5 20 12" />
              <polyline points="4 15.5 12 20 20 15.5" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Draw Circle" active>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
            </svg>
          </SidebarIcon>
        </div>

        <div className="blueprint-sidebar-group">
          <SidebarIcon label="Bookmarks">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4h10v16l-5-3-5 3z" />
            </svg>
          </SidebarIcon>
          <SidebarIcon label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7M18.2 18.2l-1.7-1.7M7.5 7.5L5.8 5.8" />
            </svg>
          </SidebarIcon>
        </div>
      </aside>

      <section className="inquiry-card" aria-label="Inquiry form">
        <h1>Interested? Get Details!</h1>

        <form className="inquiry-form">
          <div className="inquiry-name-grid">
            <label className="inquiry-field">
              First Name
              <input
                className="inquiry-input-field"
                type="text"
                name="firstName"
                placeholder="Enter first name"
              />
            </label>
            <label className="inquiry-field">
              Last Name
              <input
                className="inquiry-input-field"
                type="text"
                name="lastName"
                placeholder="Enter last name"
              />
            </label>
          </div>

          <label className="inquiry-field">
            Email
            <input
              className="inquiry-input-field"
              type="email"
              name="email"
              placeholder="your.email@example.com"
            />
          </label>

          <label className="inquiry-field">
            Phone
            <input
              className="inquiry-input-field"
              type="tel"
              name="phone"
              placeholder="+972 50 123 4567"
            />
          </label>

          <button className="submit-btn" type="button">
            Get Details!
          </button>
        </form>

        <p className="inquiry-branding">
          Ariel Israeloff - Israeloff Property Services
        </p>
      </section>
    </div>
  );
};

export default RealEstateInquiryBlueprint;

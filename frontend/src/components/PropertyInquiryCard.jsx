import React from 'react';
import './PropertyInquiryCard.css';

const agentConfig = {
  agency: 'Israeloff Property Services',
  name: 'Ariel Israeloff',
  hasWhatsApp: true,
  whatsappNumber: '972503229317',
  inquiryMessage: 'Hi Ariel, I am interested in this property. Please share more details.',
};

const PropertyInquiryCard = () => {
  return (
    <section className="property-inquiry-shell">
      <div
        className="property-inquiry-map-layer"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(232, 236, 242, 0.68), rgba(216, 222, 231, 0.68)),
            repeating-linear-gradient(38deg, #c4ccd6 0, #c4ccd6 9px, #b8c1cc 9px, #b8c1cc 18px),
            repeating-linear-gradient(-42deg, #dde2e8 0, #dde2e8 12px, #d1d8df 12px, #d1d8df 24px),
            url('/path-to-your-tel-aviv-map.png')
          `,
        }}
      />

      <div className="property-inquiry-description" dir="rtl">
        <h1>באמת צפון תל אביב, 2 מרפסות</h1>
        <p>
          באמת צפון תל אביב החדשה, דירת 4.5 חדרים חדשה עם ממד, מערבית מלאה באור עם 2 חניות ומרפסת גדולה
        </p>
      </div>

      <div className="property-inquiry-card">
        <div className="property-inquiry-card-header">
          <h2>Interested? Get Details!</h2>
          <p>
            <span>Manager: {agentConfig.agency} • {agentConfig.name}</span>
            {!agentConfig.hasWhatsApp && (
              <>
                <span className="property-inquiry-separator">•</span>
                <strong>Preferred method: Email</strong>
              </>
            )}
          </p>
        </div>

        <form className="property-inquiry-form">
          <div className="property-inquiry-name-grid">
            <label className="property-inquiry-field" htmlFor="inquiry-first-name">
              <span>First Name</span>
              <input id="inquiry-first-name" type="text" placeholder="Aaron" />
            </label>

            <label className="property-inquiry-field" htmlFor="inquiry-last-name">
              <span>Last Name</span>
              <input id="inquiry-last-name" type="text" placeholder="Miller" />
            </label>
          </div>

          <label className="property-inquiry-field" htmlFor="inquiry-email">
            <span>Email</span>
            <input id="inquiry-email" type="email" placeholder="aaronjackmiller@gmail.com" />
          </label>

          <label className="property-inquiry-field" htmlFor="inquiry-phone">
            <span>Phone</span>
            <input id="inquiry-phone" type="tel" placeholder="0533229317" />
          </label>

          <label className="property-inquiry-field" htmlFor="inquiry-message">
            <span>Message to Agent</span>
            <textarea
              id="inquiry-message"
              rows="4"
              defaultValue={agentConfig.inquiryMessage}
            />
          </label>

          <div className="property-inquiry-actions">
            <button type="submit" className="property-inquiry-primary-btn">
              Get Details!
            </button>

            {agentConfig.hasWhatsApp ? (
              <a
                href={`https://wa.me/${agentConfig.whatsappNumber}?text=${encodeURIComponent(agentConfig.inquiryMessage)}`}
                className="property-inquiry-whatsapp-btn"
                target="_blank"
                rel="noreferrer"
              >
                Chat on WhatsApp with {agentConfig.name}
              </a>
            ) : (
              <button type="button" disabled className="property-inquiry-whatsapp-btn is-disabled">
                WhatsApp Agent
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};

export default PropertyInquiryCard;

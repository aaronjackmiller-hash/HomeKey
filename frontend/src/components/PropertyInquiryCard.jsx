import React from 'react';
import './PropertyInquiryCard.css';

const agentConfig = {
  agency: 'Real Deal',
  name: "רו'ן",
  hasWhatsApp: false,
  whatsappNumber: '972503229317',
  inquiryMessage: 'Hi, I am interested in this property. Please share more details.',
};

const defaultCopy = {
  title: 'באמת צפון תל אביב, 2 מרפסות',
  subtitle: 'באמת צפון תל אביב החדשה, דירת 4.5 חדרים חדשה עם ממד, מערבית מלאה באור עם 2 חניות ומרפסת גדולה',
};

const sanitizeWhatsAppNumber = (value) => String(value || '').replace(/[^\d]/g, '');

const PropertyInquiryCard = ({
  mode = 'standalone',
  title = defaultCopy.title,
  subtitle = defaultCopy.subtitle,
  agent = agentConfig,
  formValues = null,
  onFormChange = null,
  onSubmit = null,
  statusMessage = '',
  statusIsError = false,
}) => {
  const hasControlledForm = Boolean(formValues && typeof onFormChange === 'function');
  const safeValues = hasControlledForm
    ? {
      firstName: formValues.firstName || '',
      lastName: formValues.lastName || '',
      email: formValues.email || '',
      phone: formValues.phone || '',
      message: formValues.message || '',
    }
    : null;

  const managerLine = [agent?.agency, agent?.name].filter(Boolean).join(' ').trim() || 'Property manager';
  const whatsappNumber = sanitizeWhatsAppNumber(agent?.whatsappNumber);
  const hasWhatsApp = Boolean(agent?.hasWhatsApp && whatsappNumber);
  const whatsappMessage = agent?.inquiryMessage || agentConfig.inquiryMessage;
  const rootClassName = [
    'property-inquiry-shell',
    mode === 'embedded' ? 'property-inquiry-shell--embedded' : 'property-inquiry-shell--standalone',
  ].join(' ');
  const cardClassName = [
    'property-inquiry-card',
    mode === 'embedded' ? 'property-inquiry-card--embedded' : 'property-inquiry-card--standalone',
  ].join(' ');
  const handleSubmit = onSubmit || ((event) => event.preventDefault());
  const backgroundMapUrl = `${process.env.PUBLIC_URL || ''}/tel-aviv-map.svg`;

  return (
    <section className={rootClassName}>
      <div className="property-inquiry-map-layer" aria-hidden="true">
        <img
          className="property-inquiry-map-image"
          src={backgroundMapUrl}
          alt=""
          aria-hidden="true"
        />
      </div>
      <div className="property-inquiry-map-overlay" aria-hidden="true" />

      {mode === 'embedded' && (
        <div className="property-inquiry-description" dir="rtl">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      )}

      <div className={cardClassName}>
        <div className="property-inquiry-card-header">
          <h2>Interested? Get Details!</h2>
          <p>
            <span>Manger: {managerLine}</span>
            {!hasWhatsApp && (
              <>
                <span className="property-inquiry-separator">•</span>
                <strong>Preferred method: Email</strong>
              </>
            )}
          </p>
        </div>

        <form className="property-inquiry-form" onSubmit={handleSubmit}>
          <div className="property-inquiry-name-grid">
            <label className="property-inquiry-field" htmlFor="inquiry-first-name">
              <span>First Name</span>
              <input
                id="inquiry-first-name"
                type="text"
                placeholder="Aaron"
                required
                {...(hasControlledForm ? {
                  value: safeValues.firstName,
                  onChange: (event) => onFormChange('firstName', event.target.value),
                } : {})}
              />
            </label>

            <label className="property-inquiry-field" htmlFor="inquiry-last-name">
              <span>Last Name</span>
              <input
                id="inquiry-last-name"
                type="text"
                placeholder="Miller"
                required
                {...(hasControlledForm ? {
                  value: safeValues.lastName,
                  onChange: (event) => onFormChange('lastName', event.target.value),
                } : {})}
              />
            </label>
          </div>

          <label className="property-inquiry-field" htmlFor="inquiry-email">
            <span>Email</span>
            <input
              id="inquiry-email"
              type="email"
              placeholder="aaronjackmiller@gmail.com"
              {...(hasControlledForm ? {
                value: safeValues.email,
                onChange: (event) => onFormChange('email', event.target.value),
              } : {})}
            />
          </label>

          <label className="property-inquiry-field" htmlFor="inquiry-phone">
            <span>Phone</span>
            <input
              id="inquiry-phone"
              type="tel"
              placeholder="0533229317"
              {...(hasControlledForm ? {
                value: safeValues.phone,
                onChange: (event) => onFormChange('phone', event.target.value),
              } : {})}
            />
          </label>

          <label className="property-inquiry-field" htmlFor="inquiry-message">
            <span>Message to Agent</span>
            <textarea
              id="inquiry-message"
              rows="4"
              placeholder="Message to Agent"
              {...(hasControlledForm ? {
                value: safeValues.message,
                onChange: (event) => onFormChange('message', event.target.value),
              } : {})}
            />
          </label>

          <div className="property-inquiry-actions">
            <button type="submit" className="property-inquiry-primary-btn">
              Get Details!
            </button>

            {hasWhatsApp && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                className="property-inquiry-whatsapp-btn"
                target="_blank"
                rel="noreferrer"
              >
                Chat on WhatsApp with {agent?.name || 'Agent'}
              </a>
            )}
          </div>

          {statusMessage && (
            <p className={`property-inquiry-status${statusIsError ? ' is-error' : ''}`}>
              {statusMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default PropertyInquiryCard;

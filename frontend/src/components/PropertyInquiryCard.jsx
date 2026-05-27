import React from 'react';
import './PropertyInquiryCard.css';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
  const hasControlledForm = Boolean(formValues && typeof onFormChange === 'function');
  const safeValues = hasControlledForm
    ? {
      firstName: formValues.firstName || '',
      lastName: formValues.lastName || '',
      email: formValues.email || '',
      phone: formValues.phone || '',
      messageNote: formValues.messageNote || '',
    }
    : null;

  const managerLine = [agent?.agency, agent?.name].filter(Boolean).join(' ').trim() || t('propertyInquiry.propertyManagerFallback');
  const whatsappNumber = sanitizeWhatsAppNumber(agent?.whatsappNumber);
  const hasWhatsApp = Boolean(agent?.hasWhatsApp && whatsappNumber);
  const whatsappTemplateMessage = agent?.inquiryMessageTemplate || agent?.inquiryMessage || agentConfig.inquiryMessage;
  const whatsappMessage = agent?.inquiryMessage || agentConfig.inquiryMessage;
  const rootClassName = `property-inquiry-shell${mode === 'embedded' ? ' property-inquiry-shell--embedded' : ''}`;
  const shouldShowDescription = mode === 'embedded' && (title || subtitle);
  const handleSubmit = onSubmit || ((event) => event.preventDefault());

  return (
    <section className={rootClassName}>
      {shouldShowDescription && (
        <div className="property-inquiry-description" dir="auto">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      )}

      <div className="property-inquiry-card">
        <div className="property-inquiry-card-header">
          <h2>{t('propertyInquiry.heading')}</h2>
          <p>
            <span>{t('propertyInquiry.managerLabel', { manager: managerLine })}</span>
            {!hasWhatsApp && (
              <>
                {' '}
                <strong>{t('propertyInquiry.preferredMethodEmail')}</strong>
              </>
            )}
          </p>
        </div>

        <form className="property-inquiry-form" onSubmit={handleSubmit}>
          <div className="property-inquiry-name-grid">
            <label className="property-inquiry-field" htmlFor="inquiry-first-name">
              <span>{t('propertyInquiry.firstName')}</span>
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
              <span>{t('propertyInquiry.lastName')}</span>
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
            <span>{t('propertyInquiry.email')}</span>
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
            <span>{t('propertyInquiry.phone')}</span>
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

          <label className="property-inquiry-field" htmlFor="inquiry-message-note">
            <span>{t('propertyInquiry.addNoteOptional')}</span>
            <div className="property-inquiry-message-stack">
              <textarea
                id="inquiry-message-template"
                className="property-inquiry-message-template"
                rows="1"
                value={whatsappTemplateMessage}
                readOnly
              />
              <textarea
                id="inquiry-message-note"
                className="property-inquiry-message-note"
                rows="3"
                placeholder={t('propertyInquiry.notePlaceholder')}
                {...(hasControlledForm ? {
                  value: safeValues.messageNote,
                  onChange: (event) => onFormChange('messageNote', event.target.value),
                } : {})}
              />
            </div>
          </label>

          <div className="property-inquiry-actions">
            <button type="submit" className="property-inquiry-primary-btn">
              {t('propertyInquiry.getDetailsButton')}
            </button>

            {hasWhatsApp && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                className="property-inquiry-whatsapp-btn"
                target="_blank"
                rel="noreferrer"
              >
                {t('propertyInquiry.chatOnWhatsAppWith', { agent: agent?.name || t('propertyInquiry.agentFallback') })}
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

import React, { useState } from 'react';
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
  const [localMessageNote, setLocalMessageNote] = useState('');
  const safeValues = hasControlledForm
    ? {
      firstName: formValues.firstName || '',
      lastName: formValues.lastName || '',
      email: formValues.email || '',
      phone: formValues.phone || '',
      messageNote: formValues.messageNote || '',
    }
    : null;

  const managerLine = [agent?.agency, agent?.name].filter(Boolean).join(' ').trim() || 'Property manager';
  const whatsappNumber = sanitizeWhatsAppNumber(agent?.whatsappNumber);
  const hasWhatsApp = Boolean(agent?.hasWhatsApp && whatsappNumber);
  const whatsappTemplateMessage = agent?.inquiryMessageTemplate || agent?.inquiryMessage || agentConfig.inquiryMessage;
  const whatsappMessage = agent?.inquiryMessage || agentConfig.inquiryMessage;
  const noteValue = hasControlledForm ? safeValues.messageNote : localMessageNote;
  const messageBlockPrefix = `${whatsappTemplateMessage}\n\n`;
  const combinedMessageBlockValue = `${messageBlockPrefix}${noteValue}`;
  const rootClassName = `property-inquiry-shell${mode === 'embedded' ? ' property-inquiry-shell--embedded' : ''}`;
  const shouldShowDescription = mode === 'embedded' && (title || subtitle);
  const handleSubmit = onSubmit || ((event) => event.preventDefault());
  const enforceNoteCursor = (textareaEl) => {
    if (!textareaEl || typeof textareaEl.setSelectionRange !== 'function') return;
    const cursor = textareaEl.selectionStart || 0;
    if (cursor >= messageBlockPrefix.length) return;
    const end = textareaEl.value.length;
    textareaEl.setSelectionRange(end, end);
  };
  const handleCombinedMessageKeyDown = (event) => {
    const textareaEl = event.currentTarget;
    const prefixLen = messageBlockPrefix.length;
    const selectionStart = Number(textareaEl.selectionStart || 0);
    const selectionEnd = Number(textareaEl.selectionEnd || 0);
    const selectionTouchesPrefix = selectionStart < prefixLen;
    const isModifier = event.ctrlKey || event.metaKey || event.altKey;
    const isSingleCharInsert = event.key.length === 1 && !isModifier;
    const isDestructive = event.key === 'Backspace' || event.key === 'Delete';
    const isBlockedAction = isSingleCharInsert || isDestructive || event.key === 'Enter';

    if (!isBlockedAction || !selectionTouchesPrefix) return;
    event.preventDefault();
    requestAnimationFrame(() => enforceNoteCursor(textareaEl));
  };
  const handleCombinedMessagePaste = (event) => {
    const textareaEl = event.currentTarget;
    const selectionStart = Number(textareaEl.selectionStart || 0);
    if (selectionStart >= messageBlockPrefix.length) return;
    event.preventDefault();
    requestAnimationFrame(() => enforceNoteCursor(textareaEl));
  };
  const handleCombinedMessageChange = (event) => {
    const nextRaw = String(event.target.value || '');
    let nextNote = '';

    if (nextRaw.startsWith(messageBlockPrefix)) {
      nextNote = nextRaw.slice(messageBlockPrefix.length);
    } else if (nextRaw.startsWith(whatsappTemplateMessage)) {
      nextNote = nextRaw.slice(whatsappTemplateMessage.length).replace(/^\n+/, '');
    } else {
      const separatorIndex = nextRaw.indexOf('\n\n');
      nextNote = separatorIndex >= 0 ? nextRaw.slice(separatorIndex + 2) : noteValue;
    }

    if (hasControlledForm) {
      onFormChange('messageNote', nextNote);
      return;
    }
    setLocalMessageNote(nextNote);
  };

  return (
    <section className={rootClassName}>
      {shouldShowDescription && (
        <div className="property-inquiry-description" dir="rtl">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      )}

      <div className="property-inquiry-card">
        <div className="property-inquiry-card-header">
          <h2>Interested? Get Details!</h2>
          <p>
            <span>Manager: {managerLine}</span>
            {!hasWhatsApp && (
              <>
                {' '}
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

          <label className="property-inquiry-field" htmlFor="inquiry-message-note">
            <span>Add a note (optional)</span>
            <textarea
              id="inquiry-message-note"
              rows="5"
              placeholder="Add extra details after the automated message"
              value={combinedMessageBlockValue}
              onChange={handleCombinedMessageChange}
              onKeyDown={handleCombinedMessageKeyDown}
              onPaste={handleCombinedMessagePaste}
              onFocus={(event) => requestAnimationFrame(() => enforceNoteCursor(event.currentTarget))}
            />
          </label>

          <div className="property-inquiry-actions">
            <button type="submit" className="property-inquiry-primary-btn">
              Get Details!
            </button>

            {hasWhatsApp && (
              <>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                  className="property-inquiry-whatsapp-btn"
                  target="_blank"
                  rel="noreferrer"
                >
                  Chat on WhatsApp with {agent?.name || 'Agent'}
                </a>
                <p className="property-inquiry-whatsapp-hint">
                  Locked template stays fixed in HomeKey. WhatsApp still allows edits before send.
                </p>
              </>
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

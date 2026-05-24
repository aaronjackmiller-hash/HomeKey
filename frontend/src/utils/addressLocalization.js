const safeText = (value) => (typeof value === 'string' ? value.trim() : '');

const uniqueNonEmpty = (values = []) => {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = safeText(value);
    if (!normalized) return false;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getLocalizedAddress = (address = {}, language = 'en') => {
  const sourceAddress = address && typeof address === 'object' ? address : {};
  const sourceLocalized = sourceAddress.localized && typeof sourceAddress.localized === 'object'
    ? sourceAddress.localized
    : {};
  const requestedLocalization = sourceLocalized[language] && typeof sourceLocalized[language] === 'object'
    ? sourceLocalized[language]
    : {};
  const fallbackLocalization = sourceLocalized.en && typeof sourceLocalized.en === 'object'
    ? sourceLocalized.en
    : {};

  return {
    street: safeText(requestedLocalization.street) || safeText(sourceAddress.street) || safeText(fallbackLocalization.street),
    streetNumber: safeText(requestedLocalization.streetNumber)
      || safeText(sourceAddress.streetNumber)
      || safeText(fallbackLocalization.streetNumber),
    city: safeText(requestedLocalization.city) || safeText(sourceAddress.city) || safeText(fallbackLocalization.city),
    state: safeText(requestedLocalization.state) || safeText(sourceAddress.state) || safeText(fallbackLocalization.state),
    zip: safeText(sourceAddress.zip),
    country: safeText(requestedLocalization.country) || safeText(sourceAddress.country) || safeText(fallbackLocalization.country),
  };
};

export const getAddressFieldVariants = (address = {}, fieldName = 'city') => {
  const sourceAddress = address && typeof address === 'object' ? address : {};
  const sourceLocalized = sourceAddress.localized && typeof sourceAddress.localized === 'object'
    ? sourceAddress.localized
    : {};

  return uniqueNonEmpty([
    safeText(sourceAddress[fieldName]),
    safeText(sourceLocalized.he && sourceLocalized.he[fieldName]),
    safeText(sourceLocalized.en && sourceLocalized.en[fieldName]),
  ]);
};

export const buildAddressQuery = (address = {}, language = 'en') => {
  const localizedAddress = getLocalizedAddress(address, language);
  const streetLine = language === 'en'
    ? [localizedAddress.streetNumber, localizedAddress.street].filter(Boolean).join(' ')
    : [localizedAddress.street, localizedAddress.streetNumber].filter(Boolean).join(' ');
  const country = localizedAddress.country || 'Israel';
  return [streetLine, localizedAddress.city, localizedAddress.state, country].filter(Boolean).join(', ');
};

'use strict';

const Property = require('../models/Property');
const {
    appendSourceIfMissing,
    findDuplicateCandidate,
    isStrongPropertyIdentityMatch,
} = require('./propertyMergeService');
const { queueInstantAlertsForProperties } = require('./instantAlertService');
const {
    detectContentLanguage,
    enrichLocalizedContentForImport,
    mergeLocalizedContent,
    sanitizeLocalizedContent,
} = require('./propertyLocalizationService');
const { enrichAddressLocalization } = require('./addressLocalizationService');
const { extractAmenitiesFromRow } = require('../utils/amenityExtraction');

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const HEBREW_CHAR_RE = /[א-ת]/;

const parseNumber = (value, fallback = null) => {
    if (value == null || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseType = (raw) => {
    const normalized = normalizeString(raw).toLowerCase();
    if (['rental', 'rent', 'for_rent', 'lease', 'השכרה'].includes(normalized)) return 'rental';
    return 'sale';
};

const parseStatus = (raw) => {
    const normalized = normalizeString(raw).toLowerCase();
    if (['active', 'published', 'live'].includes(normalized)) return 'active';
    if (['pending'].includes(normalized)) return 'pending';
    if (['sold', 'closed'].includes(normalized)) return 'sold';
    if (['rented', 'let'].includes(normalized)) return 'rented';
    if (['inactive', 'archived', 'draft'].includes(normalized)) return 'inactive';
    return 'active';
};

const parseSourceType = (value) => {
    const normalized = normalizeString(value).toLowerCase();
    if (normalized === 'manual') return 'manual';
    if (normalized === 'yad2-scrape') return 'yad2-scrape';
    return 'yad2-sync';
};

const hasManualSource = (propertyDoc) =>
    Boolean(propertyDoc) && (
        propertyDoc.sourceType === 'manual'
        || (Array.isArray(propertyDoc.sources) && propertyDoc.sources.some((source) => source && source.sourceType === 'manual'))
    );

const extractImageList = (row) => {
    const candidates = [
        row.images,
        row.imageUrls,
        row.photos,
        row.media,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate
                .map((item) => (typeof item === 'string' ? item : item && item.url))
                .filter((value) => typeof value === 'string' && value.trim().length > 0);
        }
    }
    return [];
};

const pickFirst = (...values) => values.find((value) => value != null && value !== '');

const parseDate = (value) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizePhone = (value) => {
    const raw = normalizeString(value);
    if (!raw) return '';
    const cleaned = raw.replace(/[^\d+]/g, '');
    return cleaned || raw;
};

const normalizePhoneLikeValue = (value) => {
    const normalized = normalizePhone(value);
    if (!normalized) return '';
    const digits = normalized.replace(/[^\d]/g, '');
    if (digits.length < 9 || digits.length > 15) return '';
    if (normalized.startsWith('+')) return `+${digits}`;
    return digits;
};

const firstPhoneFromValue = (value, seen = new Set()) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') {
        return normalizePhoneLikeValue(String(value));
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            const extracted = firstPhoneFromValue(item, seen);
            if (extracted) return extracted;
        }
        return '';
    }
    if (typeof value === 'object') {
        if (seen.has(value)) return '';
        seen.add(value);

        const direct = firstPhoneFromValue(pickFirst(
            value.phone,
            value.phoneNumber,
            value.mobile,
            value.whatsapp,
            value.whatsApp,
            value.telephone,
            value.tel,
            value.cell,
            value.value,
            value.number
        ), seen);
        if (direct) return direct;

        const typeHint = normalizeString(pickFirst(value.type, value.label, value.kind, value.method)).toLowerCase();
        if (/(phone|mobile|whats|tel|call|sms|טלפון|נייד|וואטסאפ|ווטסאפ)/i.test(typeHint)) {
            const typed = firstPhoneFromValue(pickFirst(value.value, value.number, value.phone, value.mobile), seen);
            if (typed) return typed;
        }

        const entries = Object.entries(value);
        for (const [key, nestedValue] of entries) {
            if (/(phone|mobile|whats|tel|cell|gsm|contactNumber|contact_number)/i.test(key)) {
                const extracted = firstPhoneFromValue(nestedValue, seen);
                if (extracted) return extracted;
            }
        }
        for (const [key, nestedValue] of entries) {
            if (
                /^(contact|externalContact|agent|manager|owner|advertiser|broker|details|methods|options|phones?|whatsapp|contacts?)$/i.test(key)
                || Array.isArray(nestedValue)
                || (nestedValue && typeof nestedValue === 'object')
            ) {
                const extracted = firstPhoneFromValue(nestedValue, seen);
                if (extracted) return extracted;
            }
        }
    }
    return '';
};

const mergeContactDetails = (existingContact = {}, incomingContact = {}) => {
    const merged = {
        ...(normalizeHumanText(pickFirst(incomingContact.name, existingContact.name)) ? { name: normalizeHumanText(pickFirst(incomingContact.name, existingContact.name)) } : {}),
        ...(normalizeHumanText(pickFirst(incomingContact.agency, existingContact.agency)) ? { agency: normalizeHumanText(pickFirst(incomingContact.agency, existingContact.agency)) } : {}),
        ...(normalizeString(pickFirst(incomingContact.email, existingContact.email)).toLowerCase() ? { email: normalizeString(pickFirst(incomingContact.email, existingContact.email)).toLowerCase() } : {}),
        ...(firstPhoneFromValue(pickFirst(incomingContact.phone, existingContact.phone))
            ? { phone: firstPhoneFromValue(pickFirst(incomingContact.phone, existingContact.phone)) }
            : {}),
        ...(firstPhoneFromValue(pickFirst(incomingContact.whatsapp, existingContact.whatsapp, incomingContact.phone, existingContact.phone))
            ? { whatsapp: firstPhoneFromValue(pickFirst(incomingContact.whatsapp, existingContact.whatsapp, incomingContact.phone, existingContact.phone)) }
            : {}),
    };

    const preferred = normalizePreferredContactMethod(pickFirst(
        incomingContact.preferredMethod,
        existingContact.preferredMethod
    ));
    merged.preferredMethod = preferred || (merged.whatsapp ? 'whatsapp' : (merged.phone ? 'phone' : 'email'));

    return merged;
};

const dedupeRepeatedPhrases = (value) => {
    const text = normalizeHumanText(value);
    if (!text) return '';
    const chunks = text
        .split(/[|,;/]+/)
        .map((chunk) => normalizeHumanText(chunk))
        .filter(Boolean);
    if (chunks.length === 0) return text;
    const seen = new Set();
    const unique = [];
    chunks.forEach((chunk) => {
        const key = chunk.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(chunk);
    });
    return unique.join(' • ');
};

const removeAgencyPrefixFromName = (name, agency) => {
    const normalizedName = normalizeHumanText(name);
    if (!normalizedName) return '';
    const normalizedAgency = normalizeHumanText(agency);
    if (!normalizedAgency) return normalizedName;
    const agencyLower = normalizedAgency.toLowerCase();
    const parts = normalizedName
        .split(/[|,;/]+/)
        .map((chunk) => normalizeHumanText(chunk))
        .filter(Boolean)
        .filter((chunk) => chunk.toLowerCase() !== agencyLower);
    if (parts.length === 0) return normalizedName;
    return parts.join(' • ');
};

const extractStreetAndNumberFromRawStreet = (streetValue) => {
    const streetRaw = normalizeHumanText(streetValue);
    if (!streetRaw) return { streetName: '', streetNumber: '' };
    const match = streetRaw.match(/^(.*?)(?:[,\s]+)(\d+[a-zA-Zא-ת0-9\-\/]*)$/);
    if (!match) return { streetName: streetRaw, streetNumber: '' };
    return {
        streetName: normalizeHumanText(match[1]),
        streetNumber: normalizeHumanText(match[2]),
    };
};

const normalizePreferredContactMethod = (value) => {
    const normalized = normalizeString(value).toLowerCase();
    if (['whatsapp', 'whats_app', 'wa'].includes(normalized)) return 'whatsapp';
    if (['phone', 'call', 'tel'].includes(normalized)) return 'phone';
    if (['email', 'mail'].includes(normalized)) return 'email';
    return '';
};

const normalizeHumanText = (value) => {
    const raw = normalizeString(value);
    if (!raw) return '';
    // Preserve Hebrew text exactly as provided so UI rendering remains readable.
    return raw.replace(/\s+/g, ' ').trim();
};

const containsHebrew = (value) => HEBREW_CHAR_RE.test(String(value || ''));

const pickPreferredAddressText = (...values) => {
    const normalizedValues = values
        .map((value) => normalizeHumanText(value))
        .filter(Boolean);
    if (normalizedValues.length === 0) return '';
    const hebrewMatch = normalizedValues.find((value) => containsHebrew(value));
    return hebrewMatch || normalizedValues[0];
};

const pickLocalizedText = (row, language, fieldName) => {
    if (!row || typeof row !== 'object') return '';
    const upperLanguage = language.toUpperCase();
    const titleLanguage = language.charAt(0).toUpperCase() + language.slice(1);
    const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const candidates = [
        row[`${fieldName}${upperLanguage}`],
        row[`${fieldName}${titleLanguage}`],
        row[`${fieldName}${language}`],
        row[`${fieldName}_${language}`],
        row[`${language}${capitalizedField}`],
        row[`${language}_${fieldName}`],
        row[`${language}-${fieldName}`],
        row.localizedContent && row.localizedContent[language] && row.localizedContent[language][fieldName],
        row.localized && row.localized[language] && row.localized[language][fieldName],
        row.translations && row.translations[language] && row.translations[language][fieldName],
    ];
    return normalizeHumanText(pickFirst(...candidates));
};

const buildLocalizedContentFromRow = ({ row, title, description, contentLanguage }) => {
    const localizedFromRow = sanitizeLocalizedContent({
        en: {
            title: pickLocalizedText(row, 'en', 'title'),
            description: pickLocalizedText(row, 'en', 'description'),
        },
        he: {
            title: pickLocalizedText(row, 'he', 'title'),
            description: pickLocalizedText(row, 'he', 'description'),
        },
    });

    const localizedFromDetectedLanguage = sanitizeLocalizedContent({
        [contentLanguage]: {
            title,
            description,
        },
    });

    return mergeLocalizedContent(localizedFromRow, localizedFromDetectedLanguage);
};

const parsePositiveNumber = (value) => {
    const parsed = parseNumber(value, null);
    return parsed != null && parsed > 0 ? parsed : null;
};

const parseBathroomsFromText = (value) => {
    const text = normalizeString(value);
    if (!text) return null;

    const patterns = [
        /(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?|wc|toilet[s]?)/i,
        /(?:bath(?:room)?s?|wc|toilet[s]?)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:שירותים|חדרי רחצה|אמבטי(?:ה|ות)?)/,
        /(?:שירותים|חדרי רחצה|אמבטי(?:ה|ות)?)\s*[:\-]?\s*(\d+(?:\.\d+)?)/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match || !match[1]) continue;
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
};

const parseBathrooms = (row, bedrooms) => {
    const directCandidates = [
        row.bathrooms,
        row.bathroomCount,
        row.bath,
        row.baths,
        row.bathRooms,
        row.numberOfBathrooms,
        row.numBathrooms,
        row.bathroom_count,
        row.wc,
        row.toilets,
        row.washrooms,
        row.sanitarios,
        row.details && row.details.bathrooms,
        row.details && row.details.bathroomCount,
        row.specs && row.specs.bathrooms,
        row.attributes && row.attributes.bathrooms,
        row.meta && row.meta.bathrooms,
    ];

    for (const candidate of directCandidates) {
        const parsed = parsePositiveNumber(candidate);
        if (parsed != null) return parsed;
    }

    const textCandidates = [
        row.bathroomText,
        row.bathroomsText,
        row.featuresText,
        row.attributesText,
        row.summary,
        row.description,
        row.details,
        row.body,
        row.notes,
        row.title,
        row.headline,
        row.subject,
    ];

    for (const text of textCandidates) {
        const parsed = parseBathroomsFromText(text);
        if (parsed != null) return parsed;
    }

    if (bedrooms > 0) return Math.max(1, Math.round(bedrooms / 2));
    return 1;
};

const combineStreetAndNumber = (streetName, streetNumber) => {
    const street = normalizeHumanText(streetName);
    const number = normalizeHumanText(streetNumber);
    if (!street) return number;
    if (!number) return street;
    if (street.toLowerCase().includes(number.toLowerCase())) return street;
    return `${street} ${number}`;
};

const extractStreetNumberFromText = (value) => {
    const text = normalizeString(value);
    if (!text) return { street: '', number: '' };

    const patterns = [
        /^(\d+[a-zA-Zא-ת0-9\-\/]*)\s+([a-zA-Zא-ת][a-zA-Zא-ת0-9'\-.\s]{1,60})$/i,
        /(?:street|st\.?)\s+([a-zA-Z][a-zA-Z0-9'\-.\s]{1,60})\s+(\d+[a-zA-Z0-9\-\/]*)/i,
        /(?:at|in)\s+([a-zA-Z][a-zA-Z0-9'\-.\s]{1,60})\s+(\d+[a-zA-Z0-9\-\/]*)/i,
        /(?:רחוב|רח׳|רח)\s*([א-תa-zA-Z0-9'\-.\s]{1,60})\s+(\d+[א-תa-zA-Z0-9\-\/]*)/i,
        /([a-zA-Zא-ת][a-zA-Zא-ת0-9'\-.\s]{1,60})[, ]+(\d+[a-zA-Zא-ת0-9\-\/]*)/,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match || !match[1] || !match[2]) continue;
        if (pattern === patterns[0]) {
            return {
                street: normalizeHumanText(match[2]),
                number: normalizeHumanText(match[1]),
            };
        }
        return {
            street: normalizeHumanText(match[1]),
            number: normalizeHumanText(match[2]),
        };
    }
    return { street: '', number: '' };
};

const mapYad2RowToPropertyDoc = (row) => {
    const externalId = normalizeString(String(pickFirst(
        row.externalId,
        row.id,
        row._id,
        row.yad2Id,
        row.listingId,
        row.ad_number,
        row.adNumber,
        row.listing_id,
        ''
    ) || ''));
    const city = pickPreferredAddressText(
        row.cityHe,
        row.cityHE,
        row.city_he,
        row.cityHebrew,
        row.cityNameHe,
        row.cityNameHE,
        row.city_name_he,
        row.localityHe,
        row.localityHE,
        row.locality_he,
        row.address && row.address.cityHe,
        row.address && row.address.cityHE,
        row.address && row.address.city_he,
        row.address && row.address.cityHebrew,
        row.location && row.location.cityHe,
        row.location && row.location.cityHE,
        row.location && row.location.city_he,
        row.location && row.location.cityHebrew,
        row.city,
        row.address && row.address.city,
        row.town,
        row.locality,
        row.location && row.location.city
    );
    const neighborhood = pickPreferredAddressText(
        row.neighborhoodHe,
        row.neighborhoodHE,
        row.neighborhood_he,
        row.neighborhoodHebrew,
        row.neighbourhoodHe,
        row.neighbourhoodHE,
        row.neighbourhood_he,
        row.neighbourhoodHebrew,
        row.areaNameHe,
        row.areaNameHE,
        row.area_name_he,
        row.areaNameHebrew,
        row.quarterHe,
        row.quarterHE,
        row.quarter_he,
        row.quarterHebrew,
        row.address && row.address.neighborhoodHe,
        row.address && row.address.neighborhoodHE,
        row.address && row.address.neighborhood_he,
        row.address && row.address.neighborhoodHebrew,
        row.address && row.address.neighborhood,
        row.address && row.address.neighbourhood,
        row.address && row.address.areaName,
        row.address && row.address.quarter,
        row.location && row.location.neighborhoodHe,
        row.location && row.location.neighborhoodHE,
        row.location && row.location.neighborhood_he,
        row.location && row.location.neighborhoodHebrew,
        row.location && row.location.neighborhood,
        row.location && row.location.neighbourhood,
        row.location && row.location.areaName,
        row.location && row.location.quarter,
        row.neighborhood,
        row.neighbourhood,
        row.areaName,
        row.quarter
    );

    const title = normalizeHumanText(
        pickFirst(row.title, row.headline, row.propertyTitle, row.listingTitle, row.subject)
    ) || `${parseType(row.type || row.dealType) === 'rental' ? 'Rental' : 'For Sale'} Listing in ${city || 'Israel'}`;

    const price = parseNumber(pickFirst(row.price, row.priceNis, row.amount), 0);
    const bedrooms = parseNumber(pickFirst(row.bedrooms, row.rooms, row.roomCount), 0);
    const bathrooms = parseBathrooms(row, bedrooms);
    const size = parseNumber(pickFirst(row.size, row.area, row.squareMeters), 1);

    const description = normalizeHumanText(pickFirst(row.description, row.body, row.notes, row.details));
    const contentLanguage = detectContentLanguage(
        title,
        description,
        neighborhood,
        city,
        pickPreferredAddressText(
            row.streetHe,
            row.streetHE,
            row.street_he,
            row.streetHebrew,
            row.streetNameHe,
            row.streetNameHE,
            row.street_name_he,
            row.streetNameHebrew,
            row.street,
            row.streetName,
            row.addressLine,
            row.addressText
        )
    );
    const localizedContent = buildLocalizedContentFromRow({
        row,
        title,
        description,
        contentLanguage: contentLanguage === 'he' || contentLanguage === 'en' ? contentLanguage : 'unknown',
    });

    const parsedStreetFromText = extractStreetNumberFromText(pickFirst(
        row.addressLine,
        row.addressText,
        row.fullAddress,
        row.addressLine1,
        row.locationText,
        row.location && row.location.text,
        row.address && row.address.full,
        row.address && row.address.text,
        row.title,
        row.headline,
        row.description,
        row.details
    ));

    const addressStreet = combineStreetAndNumber(
        pickPreferredAddressText(
            row.streetHe,
            row.streetHE,
            row.street_he,
            row.streetHebrew,
            row.streetNameHe,
            row.streetNameHE,
            row.street_name_he,
            row.streetNameHebrew,
            row.address && row.address.streetHe,
            row.address && row.address.streetHE,
            row.address && row.address.street_he,
            row.address && row.address.streetHebrew,
            row.address && row.address.streetNameHe,
            row.address && row.address.streetNameHE,
            row.address && row.address.street_name_he,
            row.location && row.location.streetHe,
            row.location && row.location.streetHE,
            row.location && row.location.street_he,
            row.location && row.location.streetHebrew,
            row.street,
            row.streetName,
            row.streetAddress,
            row.address1,
            row.addressLine1,
            row.address && row.address.street,
            row.address && row.address.streetName,
            row.location && row.location.street,
            parsedStreetFromText.street
        ),
        pickFirst(
            row.streetNumber,
            row.houseNumber,
            row.buildingNumber,
            row.addressNumber,
            row.streetNo,
            row.street_no,
            row.address && row.address.streetNumber,
            row.address && row.address.houseNumber,
            row.address && row.address.number,
            row.location && row.location.streetNumber,
            row.location && row.location.number,
            parsedStreetFromText.number
        )
    );
    const parsedAddressStreet = extractStreetAndNumberFromRawStreet(addressStreet);
    const finalStreet = parsedAddressStreet.streetName || addressStreet;
    const finalStreetNumber = parsedAddressStreet.streetNumber || parsedStreetFromText.number || '';
    const addressState = normalizeHumanText(pickFirst(row.state, row.district, row.region));
    const addressZip = normalizeString(pickFirst(row.zip, row.postalCode));
    const addressCountry = normalizeHumanText(pickFirst(row.country, 'Israel')) || 'Israel';

    const buildingName = normalizeHumanText(pickFirst(
        row.buildingName,
        row.buildingDetails && row.buildingDetails.name,
        row.building && row.building.name
    ));
    const floorCount = parseNumber(pickFirst(
        row.floorCount,
        row.buildingDetails && row.buildingDetails.floorCount,
        row.building && row.building.floorCount
    ), undefined);
    const apartmentCount = parseNumber(pickFirst(
        row.apartmentCount,
        row.buildingDetails && row.buildingDetails.apartmentCount,
        row.building && row.building.apartmentCount
    ), undefined);
    const extractedAmenities = extractAmenitiesFromRow(row, { buildingName, max: 8 });

    const availableFrom = parseDate(pickFirst(row.availableFrom, row.dates && row.dates.availableFrom));
    const listingDate = parseDate(pickFirst(row.listingDate, row.publishedAt, row.createdAt));

    const type = parseType(pickFirst(row.type, row.dealType, row.deal_type));
    const floorNumber = parseNumber(pickFirst(row.floorNumber, row.floor), undefined);
    const externalUrl = normalizeString(pickFirst(row.url, row.listingUrl, row.externalUrl, row.link));
    const sourceType = parseSourceType(pickFirst(row.sourceType, row.source_type, 'yad2-sync'));
    const externalSegmentKey = normalizeString(pickFirst(row.externalSegmentKey, row.segmentKey, row.segment))
        .toLowerCase();
    const rawContactName = normalizeHumanText(pickFirst(
        row.contactName,
        row.managerName,
        row.agentName,
        row.contactPerson,
        row.contact_person,
        row.contactFullName,
        row.contact && row.contact.name,
        row.contact && row.contact.fullName,
        row.agent && row.agent.name,
        row.manager && row.manager.name,
        row.owner && row.owner.name,
        row.advertiser && row.advertiser.name,
        row.contactDetails && row.contactDetails.name,
        row.ownerName,
        row.advertiserName
    ));
    const contactPhone = firstPhoneFromValue(pickFirst(
        row.contactPhone,
        row.phone,
        row.mobile,
        row.phoneNumber,
        row.phoneNumbers,
        row.phones,
        row.contactPhones,
        row.contactMobile,
        row.agentPhone,
        row.contact && row.contact.phone,
        row.contact && row.contact.mobile,
        row.contact && row.contact.phoneNumber,
        row.contact && row.contact.phoneNumbers,
        row.contact && row.contact.phones,
        row.agent && row.agent.phone,
        row.agent && row.agent.mobile,
        row.agent && row.agent.phoneNumber,
        row.agent && row.agent.phoneNumbers,
        row.manager && row.manager.phone,
        row.manager && row.manager.mobile,
        row.manager && row.manager.phoneNumber,
        row.manager && row.manager.phoneNumbers,
        row.owner && row.owner.phone,
        row.owner && row.owner.mobile,
        row.owner && row.owner.phoneNumber,
        row.owner && row.owner.phoneNumbers,
        row.advertiser && row.advertiser.phone,
        row.advertiser && row.advertiser.mobile,
        row.advertiser && row.advertiser.phoneNumber,
        row.advertiser && row.advertiser.phoneNumbers,
        row.contactDetails && row.contactDetails.phone,
        row.contactDetails && row.contactDetails.mobile,
        row.contactDetails && row.contactDetails.phoneNumber,
        row.contactDetails && row.contactDetails.phoneNumbers,
        row.externalContact && row.externalContact.phone,
        row.externalContact && row.externalContact.mobile,
        row.externalContact && row.externalContact.phoneNumber,
        row.externalContact && row.externalContact.phoneNumbers,
        row.contactMethods,
        row.contactOptions,
        row.managerPhone,
        row.ownerPhone,
        row.advertiserPhone
    ));
    const contactWhatsapp = firstPhoneFromValue(pickFirst(
        row.whatsapp,
        row.whatsApp,
        row.whatsappNumber,
        row.whatsappPhone,
        row.whatsAppPhone,
        row.whatsappNumbers,
        row.contactWhatsapp,
        row.contactWhatsApp,
        row.agentWhatsapp,
        row.agentWhatsApp,
        row.contact && row.contact.whatsapp,
        row.contact && row.contact.whatsApp,
        row.contact && row.contact.whatsappNumber,
        row.contact && row.contact.whatsappNumbers,
        row.agent && row.agent.whatsapp,
        row.agent && row.agent.whatsApp,
        row.agent && row.agent.whatsappNumber,
        row.agent && row.agent.whatsappNumbers,
        row.manager && row.manager.whatsapp,
        row.manager && row.manager.whatsApp,
        row.manager && row.manager.whatsappNumber,
        row.manager && row.manager.whatsappNumbers,
        row.owner && row.owner.whatsapp,
        row.owner && row.owner.whatsApp,
        row.owner && row.owner.whatsappNumber,
        row.owner && row.owner.whatsappNumbers,
        row.advertiser && row.advertiser.whatsapp,
        row.advertiser && row.advertiser.whatsApp,
        row.advertiser && row.advertiser.whatsappNumber,
        row.advertiser && row.advertiser.whatsappNumbers,
        row.contactDetails && row.contactDetails.whatsapp,
        row.contactDetails && row.contactDetails.whatsApp,
        row.contactDetails && row.contactDetails.whatsappNumber,
        row.contactDetails && row.contactDetails.whatsappNumbers,
        row.externalContact && row.externalContact.whatsapp,
        row.externalContact && row.externalContact.whatsApp,
        row.externalContact && row.externalContact.whatsappNumber,
        row.externalContact && row.externalContact.whatsappNumbers,
        row.managerWhatsapp
    ));
    const contactEmail = normalizeString(pickFirst(
        row.contactEmail,
        row.email,
        row.agentEmail,
        row.contact && row.contact.email,
        row.contact && row.contact.mail,
        row.agent && row.agent.email,
        row.manager && row.manager.email,
        row.owner && row.owner.email,
        row.advertiser && row.advertiser.email,
        row.contactDetails && row.contactDetails.email,
        row.managerEmail,
        row.ownerEmail,
        row.advertiserEmail
    )).toLowerCase();
    const contactAgency = dedupeRepeatedPhrases(pickFirst(
        row.agency,
        row.brokerAgency,
        row.officeName,
        row.agentAgency,
        row.contactAgency,
        row.contact && row.contact.agency,
        row.agent && row.agent.agency,
        row.manager && row.manager.agency,
        row.advertiser && row.advertiser.agency,
        row.contactDetails && row.contactDetails.agency
    ));
    const contactName = removeAgencyPrefixFromName(dedupeRepeatedPhrases(rawContactName), contactAgency);
    const preferredContactMethod = normalizePreferredContactMethod(pickFirst(
        row.preferredContactMethod,
        row.preferredMethod,
        row.contactMethod,
        row.contact && row.contact.preferredMethod,
        row.contact && row.contact.preferredContactMethod,
        row.agent && row.agent.preferredMethod,
        row.agent && row.agent.preferredContactMethod,
        row.contactDetails && row.contactDetails.preferredMethod
    ));

    const payload = {
        title,
        description,
        contentLanguage,
        localizedContent,
        type,
        price,
        bedrooms,
        bathrooms,
        size,
        ...(floorNumber != null ? { floorNumber } : {}),
        address: {
            street: finalStreet,
            ...(finalStreetNumber ? { streetNumber: finalStreetNumber } : {}),
            ...(neighborhood ? { neighborhood } : {}),
            city,
            state: addressState,
            zip: addressZip,
            country: addressCountry,
        },
        buildingDetails: {
            ...(buildingName ? { name: buildingName } : {}),
            ...(floorCount != null ? { floorCount } : {}),
            ...(apartmentCount != null ? { apartmentCount } : {}),
        },
        ...(extractedAmenities.length > 0 ? { amenities: extractedAmenities } : {}),
        financialDetails: {
            ...(parseNumber(pickFirst(row.totalMonthlyPayment, row.financialDetails && row.financialDetails.totalMonthlyPayment)) != null
                ? { totalMonthlyPayment: parseNumber(pickFirst(row.totalMonthlyPayment, row.financialDetails && row.financialDetails.totalMonthlyPayment)) }
                : {}),
            ...(parseNumber(pickFirst(row.vaadAmount, row.financialDetails && row.financialDetails.vaadAmount)) != null
                ? { vaadAmount: parseNumber(pickFirst(row.vaadAmount, row.financialDetails && row.financialDetails.vaadAmount)) }
                : {}),
            ...(parseNumber(pickFirst(row.cityTaxes, row.financialDetails && row.financialDetails.cityTaxes)) != null
                ? { cityTaxes: parseNumber(pickFirst(row.cityTaxes, row.financialDetails && row.financialDetails.cityTaxes)) }
                : {}),
            ...(parseNumber(pickFirst(row.maintenanceFees, row.financialDetails && row.financialDetails.maintenanceFees)) != null
                ? { maintenanceFees: parseNumber(pickFirst(row.maintenanceFees, row.financialDetails && row.financialDetails.maintenanceFees)) }
                : {}),
            ...(parseNumber(pickFirst(row.propertyTax, row.financialDetails && row.financialDetails.propertyTax)) != null
                ? { propertyTax: parseNumber(pickFirst(row.propertyTax, row.financialDetails && row.financialDetails.propertyTax)) }
                : {}),
        },
        dates: {
            ...(availableFrom ? { availableFrom } : {}),
            ...(listingDate ? { listingDate } : {}),
        },
        images: extractImageList(row),
        status: parseStatus(pickFirst(row.status, row.listingStatus)),
        sourceType,
        ...(externalSegmentKey ? { externalSegmentKey } : {}),
        contact: mergeContactDetails({}, {
            ...(contactName ? { name: contactName } : {}),
            ...(contactAgency ? { agency: contactAgency } : {}),
            ...(contactPhone ? { phone: contactPhone } : {}),
            ...(contactWhatsapp ? { whatsapp: contactWhatsapp } : {}),
            ...(contactEmail ? { email: contactEmail } : {}),
            preferredMethod: preferredContactMethod || (contactWhatsapp ? 'whatsapp' : (contactPhone ? 'phone' : 'email')),
        }),
        sources: [
            {
                sourceType,
                externalSource: 'yad2',
                ...(externalSegmentKey ? { externalSegmentKey } : {}),
                ...(externalId ? { externalId } : {}),
                ...(externalUrl ? { externalUrl } : {}),
                addedAt: new Date(),
            },
        ],
        externalSource: 'yad2',
        ...(externalId ? { externalId } : {}),
        ...(externalUrl ? { externalUrl } : {}),
    };

    return { payload, externalId };
};

const importYad2Listings = async ({ rows, upsert = true, sourceTag = 'yad2' }) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('rows must be a non-empty array');
    }

    const normalizedSourceTag = normalizeString(sourceTag).toLowerCase() || 'yad2';

    const summary = {
        total: rows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        sourceTag: normalizedSourceTag,
        errors: [],
    };
    const createdProperties = [];

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        try {
            const { payload, externalId } = mapYad2RowToPropertyDoc(row);
            payload.localizedContent = await enrichLocalizedContentForImport({
                title: payload.title,
                description: payload.description,
                contentLanguage: payload.contentLanguage,
                localizedContent: payload.localizedContent,
            });
            payload.address = await enrichAddressLocalization(payload.address);

            if (!payload.title || payload.price <= 0 || payload.size <= 0) {
                summary.skipped += 1;
                summary.errors.push({ index: i, reason: 'Missing required fields (title/price/size).' });
                continue;
            }

            payload.externalSource = normalizedSourceTag;

            const sourceType = parseSourceType(payload.sourceType);
            const segmentKey = normalizeString(payload.externalSegmentKey).toLowerCase();
            const sourceEntry = {
                sourceType,
                externalSource: normalizedSourceTag,
                ...(externalId ? { externalId } : {}),
                ...(payload.externalUrl ? { externalUrl: payload.externalUrl } : {}),
                addedAt: new Date(),
            };

            if (upsert && externalId) {
                const existing = await Property.findOne({
                    externalSource: normalizedSourceTag,
                    externalId,
                });
                if (existing) {
                    const hasManualSource = existing.sourceType === 'manual'
                        || (Array.isArray(existing.sources) && existing.sources.some((source) => source && source.sourceType === 'manual'));
                    const mergedLocalizedContent = mergeLocalizedContent(
                        existing.localizedContent,
                        payload.localizedContent
                    );
                    appendSourceIfMissing(existing, sourceEntry);
                    Object.assign(existing, payload, {
                        sourceType: hasManualSource ? 'manual' : sourceType,
                        externalSource: normalizedSourceTag,
                        externalId,
                        ...(segmentKey ? { externalSegmentKey: segmentKey } : {}),
                    });
                    existing.localizedContent = mergedLocalizedContent;
                    if (hasManualSource && existing.contentLanguage !== 'he' && existing.contentLanguage !== 'en') {
                        existing.contentLanguage = existing.contentLanguage || 'unknown';
                    }
                    existing.contact = mergeContactDetails(existing.contact, payload.contact);
                    if (hasManualSource && existing.contact && existing.owner) {
                        // Keep owner-facing manual contact workflow active when merged with live feed records.
                        existing.sourceType = 'manual';
                    }
                    await existing.save();
                    summary.updated += 1;
                } else {
                    const duplicate = await findDuplicateCandidate(payload);
                    const hasStrongIdentityMatch = Boolean(duplicate) && isStrongPropertyIdentityMatch(duplicate, payload);
                    const shouldMergeIntoDuplicate = Boolean(duplicate) && (
                        // Preserve the manual-owner workflow by merging feed updates into a
                        // manually created listing that represents the same home.
                        hasManualSource(duplicate)
                        // Cross-source imports can also represent the same listing with different
                        // source IDs. Merge only when identity matching is high-confidence.
                        || hasStrongIdentityMatch
                        // Rows without external IDs cannot be safely upserted and may still
                        // require fuzzy duplicate matching to avoid repeated inserts.
                        || !externalId
                    );
                    if (shouldMergeIntoDuplicate) {
                        duplicate.description = payload.description || duplicate.description;
                        duplicate.price = payload.price;
                        duplicate.bedrooms = payload.bedrooms;
                        duplicate.bathrooms = payload.bathrooms;
                        duplicate.size = payload.size;
                        duplicate.floorNumber = payload.floorNumber;
                        duplicate.financialDetails = payload.financialDetails;
                        duplicate.dates = payload.dates;
                        duplicate.contact = mergeContactDetails(duplicate.contact, payload.contact);
                        duplicate.images = Array.isArray(payload.images) && payload.images.length > 0 ? payload.images : duplicate.images;
                        if (Array.isArray(payload.amenities) && payload.amenities.length > 0) {
                            duplicate.amenities = payload.amenities;
                        }
                        duplicate.status = payload.status || duplicate.status;
                        duplicate.externalSource = normalizedSourceTag;
                        duplicate.externalId = externalId;
                        if (segmentKey) {
                            duplicate.externalSegmentKey = segmentKey;
                        }
                        duplicate.externalUrl = payload.externalUrl || duplicate.externalUrl;
                        duplicate.localizedContent = mergeLocalizedContent(
                            duplicate.localizedContent,
                            payload.localizedContent
                        );
                        if (!duplicate.contentLanguage || duplicate.sourceType !== 'manual') {
                            duplicate.contentLanguage = payload.contentLanguage || duplicate.contentLanguage || 'unknown';
                        }
                        duplicate.sources = Array.isArray(duplicate.sources) ? duplicate.sources : [];
                        if (!duplicate.title || duplicate.sourceType !== 'manual') {
                            duplicate.title = payload.title;
                        }
                        if (!duplicate.sourceType || duplicate.sourceType !== 'manual') {
                            duplicate.sourceType = sourceType;
                        }
                        appendSourceIfMissing(duplicate, sourceEntry);
                        await duplicate.save();
                        summary.updated += 1;
                    }
                    if (!shouldMergeIntoDuplicate) {
                        // For Yad2 rows with explicit external IDs, keep each externalId as a
                        // distinct listing record. This prevents unrelated feed rows from being
                        // collapsed into a single document by fuzzy duplicate scoring.
                        const createdProperty = await Property.create({
                            ...payload,
                            sourceType,
                            ...(segmentKey ? { externalSegmentKey: segmentKey } : {}),
                            sources: [sourceEntry],
                        });
                        createdProperties.push(createdProperty.toObject ? createdProperty.toObject() : createdProperty);
                        summary.created += 1;
                    }
                }
            } else {
                const createdProperty = await Property.create({
                    ...payload,
                    sourceType,
                    ...(segmentKey ? { externalSegmentKey: segmentKey } : {}),
                    sources: [sourceEntry],
                });
                createdProperties.push(createdProperty.toObject ? createdProperty.toObject() : createdProperty);
                summary.created += 1;
            }
        } catch (err) {
            summary.skipped += 1;
            summary.errors.push({ index: i, reason: err.message });
        }
    }

    if (createdProperties.length > 0) {
        try {
            const dispatched = await queueInstantAlertsForProperties(createdProperties);
            summary.alertsCreated = dispatched.alertsCreated;
            summary.alertsUsersNotified = dispatched.usersNotified;
        } catch (alertErr) {
            summary.alertDispatchError = alertErr.message;
        }
    }

    return summary;
};

module.exports = {
    importYad2Listings,
    mapYad2RowToPropertyDoc,
};

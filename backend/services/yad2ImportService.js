'use strict';

const Property = require('../models/Property');

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

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
    const city = normalizeString(pickFirst(row.city, row.address && row.address.city, row.town));

    const title = normalizeString(
        pickFirst(row.title, row.headline, row.propertyTitle, row.listingTitle, row.subject)
    ) || `${parseType(row.type || row.dealType) === 'rental' ? 'Rental' : 'For Sale'} Listing in ${city || 'Israel'}`;

    const price = parseNumber(pickFirst(row.price, row.priceNis, row.amount), 0);
    const bedrooms = parseNumber(pickFirst(row.bedrooms, row.rooms, row.roomCount), 0);
    const bathrooms = parseNumber(pickFirst(row.bathrooms, row.bathroomCount), 0);
    const size = parseNumber(pickFirst(row.size, row.area, row.squareMeters), 1);

    const description = normalizeString(pickFirst(row.description, row.body, row.notes, row.details));

    const addressStreet = normalizeString(pickFirst(row.street, row.address && row.address.street));
    const addressState = normalizeString(pickFirst(row.state, row.district, row.region));
    const addressZip = normalizeString(pickFirst(row.zip, row.postalCode));
    const addressCountry = normalizeString(pickFirst(row.country, 'Israel')) || 'Israel';

    const buildingName = normalizeString(pickFirst(row.buildingName, row.building && row.building.name));
    const floorCount = parseNumber(pickFirst(row.floorCount, row.building && row.building.floorCount), undefined);
    const apartmentCount = parseNumber(pickFirst(row.apartmentCount, row.building && row.building.apartmentCount), undefined);

    const availableFrom = parseDate(pickFirst(row.availableFrom, row.dates && row.dates.availableFrom));
    const listingDate = parseDate(pickFirst(row.listingDate, row.publishedAt, row.createdAt));

    const type = parseType(pickFirst(row.type, row.dealType, row.deal_type));
    const floorNumber = parseNumber(pickFirst(row.floorNumber, row.floor), undefined);
    const externalUrl = normalizeString(pickFirst(row.url, row.listingUrl, row.externalUrl));

    const payload = {
        title,
        description,
        type,
        price,
        bedrooms,
        bathrooms,
        size,
        ...(floorNumber != null ? { floorNumber } : {}),
        address: {
            street: addressStreet,
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

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        try {
            const { payload, externalId } = mapYad2RowToPropertyDoc(row);

            if (!payload.title || payload.price <= 0 || payload.size <= 0) {
                summary.skipped += 1;
                summary.errors.push({ index: i, reason: 'Missing required fields (title/price/size).' });
                continue;
            }

            payload.externalSource = normalizedSourceTag;

            if (upsert && externalId) {
                const existing = await Property.findOne({
                    externalSource: normalizedSourceTag,
                    externalId,
                });
                if (existing) {
                    await Property.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
                    summary.updated += 1;
                } else {
                    await Property.create(payload);
                    summary.created += 1;
                }
            } else {
                await Property.create(payload);
                summary.created += 1;
            }
        } catch (err) {
            summary.skipped += 1;
            summary.errors.push({ index: i, reason: err.message });
        }
    }

    return summary;
};

module.exports = {
    importYad2Listings,
};

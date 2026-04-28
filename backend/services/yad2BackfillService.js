'use strict';

const mongoose = require('mongoose');
const Property = require('../models/Property');
const { importYad2Listings } = require('./yad2ImportService');

const normalizeSourceTag = (value) =>
    String(value || '')
        .trim()
        .toLowerCase();

const toPositiveIntegerOrNull = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
};

const normalizeBatchSize = (value, fallback = 250) => {
    const parsed = toPositiveIntegerOrNull(value);
    if (!parsed) return fallback;
    return Math.min(1000, Math.max(50, parsed));
};

const extractStreetParts = (streetValue) => {
    const street = String(streetValue || '').trim();
    if (!street) return { street: '', streetNumber: '' };
    const match = street.match(/^(.*?)[,\s]+(\d+[a-zA-Z0-9\-\/]*)$/);
    if (!match) return { street, streetNumber: '' };
    return {
        street: String(match[1] || '').trim(),
        streetNumber: String(match[2] || '').trim(),
    };
};

const buildBackfillRow = (property) => {
    const address = property && property.address && typeof property.address === 'object'
        ? property.address
        : {};
    const contact = property && property.contact && typeof property.contact === 'object'
        ? property.contact
        : {};
    const dates = property && property.dates && typeof property.dates === 'object'
        ? property.dates
        : {};
    const building = property && property.buildingDetails && typeof property.buildingDetails === 'object'
        ? property.buildingDetails
        : {};
    const financial = property && property.financialDetails && typeof property.financialDetails === 'object'
        ? property.financialDetails
        : {};

    const streetParts = extractStreetParts(address.street);

    return {
        externalId: property.externalId,
        title: property.title,
        description: property.description,
        type: property.type,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        size: property.size,
        floorNumber: property.floorNumber,
        city: address.city,
        street: streetParts.street || address.street,
        streetNumber: streetParts.streetNumber,
        state: address.state,
        zip: address.zip,
        country: address.country,
        availableFrom: dates.availableFrom,
        listingDate: dates.listingDate,
        buildingName: building.name,
        floorCount: building.floorCount,
        apartmentCount: building.apartmentCount,
        totalMonthlyPayment: financial.totalMonthlyPayment,
        vaadAmount: financial.vaadAmount,
        cityTaxes: financial.cityTaxes,
        maintenanceFees: financial.maintenanceFees,
        propertyTax: financial.propertyTax,
        images: Array.isArray(property.images) ? property.images : [],
        status: property.status,
        sourceType: property.sourceType,
        externalSegmentKey: property.externalSegmentKey,
        externalUrl: property.externalUrl,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactWhatsapp: contact.whatsapp,
        contactEmail: contact.email,
        contactAgency: contact.agency,
        preferredContactMethod: contact.preferredMethod,
        contact,
    };
};

const summarizeDryRunGroups = (rows) => {
    const counts = new Map();
    for (const row of rows) {
        const source = normalizeSourceTag(row.externalSource || 'yad2') || 'yad2';
        counts.set(source, (counts.get(source) || 0) + 1);
    }
    return Array.from(counts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sourceTag, count]) => ({ sourceTag, count }));
};

const buildBaseFilter = (normalizedSourceTag) => ({
    externalSource: normalizedSourceTag
        ? normalizedSourceTag
        : { $regex: 'yad2', $options: 'i' },
    externalId: { $exists: true, $type: 'string', $ne: '' },
});

const backfillYad2Listings = async ({
    sourceTag = null,
    batchSize = 250,
    limit = null,
    dryRun = false,
    logger = console,
} = {}) => {
    const normalizedSourceTag = normalizeSourceTag(sourceTag);
    const normalizedLimit = toPositiveIntegerOrNull(limit);
    const normalizedBatchSize = normalizeBatchSize(batchSize);

    const filter = buildBaseFilter(normalizedSourceTag);
    const totalInScope = await Property.countDocuments(filter);
    const totalCandidates = normalizedLimit ? Math.min(totalInScope, normalizedLimit) : totalInScope;

    if (totalCandidates === 0) {
        return {
            dryRun: Boolean(dryRun),
            sourceTag: normalizedSourceTag || null,
            totalCandidates: 0,
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            groups: [],
        };
    }

    if (dryRun) {
        const grouped = await Property.aggregate([
            { $match: filter },
            { $group: { _id: '$externalSource', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        const groups = grouped
            .map((row) => ({
                sourceTag: normalizeSourceTag(row._id || 'yad2') || 'yad2',
                count: Number(row.count || 0),
            }))
            .map((row) => ({
                ...row,
                count: normalizedLimit ? Math.min(row.count, normalizedLimit) : row.count,
            }))
            .filter((row) => row.count > 0);
        return {
            dryRun: true,
            sourceTag: normalizedSourceTag || null,
            totalCandidates,
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            groups,
        };
    }

    const summary = {
        dryRun: false,
        sourceTag: normalizedSourceTag || null,
        totalCandidates,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        groups: [],
    };

    let lastSeenId = null;
    let scanned = 0;
    while (scanned < totalCandidates) {
        const remaining = totalCandidates - scanned;
        const currentBatchSize = Math.min(normalizedBatchSize, remaining);
        const batchFilter = {
            ...filter,
            ...(lastSeenId ? { _id: { $gt: lastSeenId } } : {}),
        };
        const properties = await Property.find(batchFilter)
            .sort({ _id: 1 })
            .limit(currentBatchSize)
            .lean();

        if (!Array.isArray(properties) || properties.length === 0) break;
        lastSeenId = properties[properties.length - 1]._id;
        scanned += properties.length;

        const rows = properties.map((property) => ({
            ...buildBackfillRow(property),
            externalSource: normalizeSourceTag(property.externalSource) || 'yad2',
        }));

        const groupedBySource = new Map();
        for (const row of rows) {
            const rowSource = normalizeSourceTag(row.externalSource) || normalizedSourceTag || 'yad2';
            if (!groupedBySource.has(rowSource)) groupedBySource.set(rowSource, []);
            groupedBySource.get(rowSource).push(row);
        }

        for (const [groupSourceTag, groupRows] of groupedBySource.entries()) {
            const groupResult = await importYad2Listings({
                rows: groupRows,
                upsert: true,
                sourceTag: groupSourceTag,
            });
            summary.processed += Number(groupResult.total || 0);
            summary.created += Number(groupResult.created || 0);
            summary.updated += Number(groupResult.updated || 0);
            summary.skipped += Number(groupResult.skipped || 0);
            if (Array.isArray(groupResult.errors) && groupResult.errors.length > 0) {
                summary.errors.push(...groupResult.errors.map((error) => ({
                    ...error,
                    sourceTag: groupSourceTag,
                })));
            }
            summary.groups.push({
                sourceTag: groupSourceTag,
                total: Number(groupResult.total || 0),
                created: Number(groupResult.created || 0),
                updated: Number(groupResult.updated || 0),
                skipped: Number(groupResult.skipped || 0),
                errorCount: Array.isArray(groupResult.errors) ? groupResult.errors.length : 0,
            });
            logger.log(
                `[yad2-backfill] source=${groupSourceTag} total=${groupResult.total} created=${groupResult.created} updated=${groupResult.updated} skipped=${groupResult.skipped}`
            );
        }
    }

    return summary;
};

const parseCliArgs = (argv = process.argv.slice(2)) => {
    const args = {
        sourceTag: null,
        batchSize: 250,
        limit: null,
        dryRun: false,
        help: false,
    };
    for (const token of argv) {
        if (token === '--help' || token === '-h') {
            args.help = true;
            continue;
        }
        if (token === '--dry-run') {
            args.dryRun = true;
            continue;
        }
        if (token.startsWith('--sourceTag=')) {
            args.sourceTag = token.split('=').slice(1).join('=');
            continue;
        }
        if (token.startsWith('--batchSize=')) {
            args.batchSize = token.split('=').slice(1).join('=');
            continue;
        }
        if (token.startsWith('--limit=')) {
            args.limit = token.split('=').slice(1).join('=');
        }
    }
    return args;
};

const printCliHelp = () => {
    console.log('Usage: node services/yad2BackfillService.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --sourceTag=<tag>   Reprocess only this externalSource');
    console.log('  --batchSize=<n>     Batch size per DB read (50-1000, default 250)');
    console.log('  --limit=<n>         Process only first N candidates');
    console.log('  --dry-run           Show affected counts without writing');
    console.log('  --help              Show this help message');
};

const runCli = async () => {
    const args = parseCliArgs();
    if (args.help) {
        printCliHelp();
        return;
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is required for backfill CLI usage.');
        process.exitCode = 1;
        return;
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 30000,
            bufferCommands: false,
        });
        const result = await backfillYad2Listings({
            sourceTag: args.sourceTag,
            batchSize: args.batchSize,
            limit: args.limit,
            dryRun: args.dryRun,
            logger: console,
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error(`[yad2-backfill] Failed: ${err.message}`);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

if (require.main === module) {
    runCli();
}

module.exports = {
    backfillYad2Listings,
};

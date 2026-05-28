import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createProperty } from '../services/api';
import { Step1AddListing } from './addListingSteps/Step1AddListing';
import { Step2CreateListing } from './addListingSteps/Step2CreateListing';
import { Step3Amenities } from './addListingSteps/Step3Amenities';
import { Step4Media } from './addListingSteps/Step4Media';
import { Step5PublishListing } from './addListingSteps/Step5PublishListing';

/**
 * @typedef {Object} ListingData
 * @property {'Apartment'|'House'} propertyType
 * @property {'Rental'|'For Sale'} listingType
 * @property {boolean} lookingForRoommates
 * @property {{street: string, number: string, city: string}} address
 * @property {string} relation
 * @property {string} bedrooms
 * @property {string} bathrooms
 * @property {string} sizeSqm
 * @property {string} dateAvailable
 * @property {string} price
 * @property {string} deposit
 * @property {string} leaseLength
 * @property {string} floorNumber
 * @property {string} description
 * @property {string[]} amenities
 * @property {File[]} mediaFiles
 * @property {string} virtualTourUrl
 */

/** @returns {ListingData} */
const createInitialListingData = () => ({
    propertyType: 'Apartment',
    listingType: 'Rental',
    lookingForRoommates: false,
    address: { street: '', number: '', city: '' },
    relation: '',
    bedrooms: '1',
    bathrooms: '1',
    sizeSqm: '',
    dateAvailable: '',
    price: '',
    deposit: '',
    leaseLength: '',
    floorNumber: '',
    description: '',
    amenities: [],
    mediaFiles: [],
    virtualTourUrl: '',
});

const AddListing = () => {
    const history = useHistory();
    const [step, setStep] = useState(1);
    const [data, setData] = useState(createInitialListingData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const updateData = (updates) => {
        setData((prev) => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        setStep((prev) => Math.min(prev + 1, 5));
    };

    const prevStep = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const parseNumber = (rawValue) => {
        if (rawValue === '' || rawValue == null) {
            return null;
        }
        const cleaned = String(rawValue).replace(/,/g, '').trim();
        if (!cleaned) {
            return null;
        }
        const numeric = Number(cleaned);
        return Number.isFinite(numeric) ? numeric : null;
    };

    const buildPayloadFromListingData = () => {
        const price = parseNumber(data.price);
        const bedrooms = parseNumber(data.bedrooms);
        const bathrooms = parseNumber(data.bathrooms);
        const size = parseNumber(data.sizeSqm);
        const floorNumber = parseNumber(data.floorNumber);
        const deposit = parseNumber(data.deposit);

        if (
            !data.address.street.trim()
            || !data.address.city.trim()
            || price === null
            || bedrooms === null
            || bathrooms === null
            || size === null
        ) {
            return null;
        }

        const summaryRows = [
            `Listing relation: ${data.relation || 'N/A'}`,
            `Looking for roommates: ${data.lookingForRoommates ? 'Yes' : 'No'}`,
            `Lease length: ${data.leaseLength || 'N/A'}`,
            `Deposit: ${data.deposit || 'N/A'}`,
        ];

        return {
            title: `${data.propertyType} ${data.listingType} in ${data.address.city}`,
            description: [data.description.trim(), summaryRows.join('\n')].filter(Boolean).join('\n\n'),
            type: data.listingType === 'For Sale' ? 'sale' : 'rental',
            price,
            bedrooms,
            bathrooms,
            size,
            ...(floorNumber !== null ? { floorNumber } : {}),
            address: {
                street: data.address.street.trim(),
                streetNumber: data.address.number.trim(),
                city: data.address.city.trim(),
                country: 'Israel',
            },
            amenities: data.amenities,
            virtualTourUrl: data.virtualTourUrl.trim(),
            dates: {
                ...(data.dateAvailable ? { availableFrom: data.dateAvailable } : {}),
            },
            financialDetails: {
                ...(deposit !== null ? { totalMonthlyPayment: price, maintenanceFees: deposit } : {}),
            },
            status: 'active',
        };
    };

    const onPublishFinished = async () => {
        setError('');
        const payload = buildPayloadFromListingData();
        if (!payload) {
            setError('Please complete address, price, bedrooms, bathrooms, and size before publishing.');
            setStep(2);
            return;
        }

        setLoading(true);
        try {
            const result = await createProperty(payload);
            history.push(`/properties/${result.data._id}`);
        } catch (err) {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                setError(apiErrors.map((entry) => entry.msg).join(', '));
            } else {
                setError(err.response?.data?.message || 'Failed to publish listing.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 20px' }}>
            {error ? <p style={{ color: '#b91c1c', marginBottom: '12px' }}>{error}</p> : null}
            {loading ? <p style={{ color: '#374151', marginBottom: '12px' }}>Publishing listing...</p> : null}

            {step === 1 ? <Step1AddListing data={data} updateData={updateData} nextStep={nextStep} /> : null}
            {step === 2 ? <Step2CreateListing data={data} updateData={updateData} nextStep={nextStep} prevStep={prevStep} /> : null}
            {step === 3 ? <Step3Amenities data={data} updateData={updateData} nextStep={nextStep} prevStep={prevStep} /> : null}
            {step === 4 ? <Step4Media data={data} updateData={updateData} nextStep={nextStep} prevStep={prevStep} /> : null}
            {step === 5 ? <Step5PublishListing data={data} prevStep={prevStep} onPublishFinished={onPublishFinished} /> : null}
        </div>
    );
};

export default AddListing;
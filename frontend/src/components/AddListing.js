import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createProperty } from '../services/api';
import { Step1AddListing } from './addListingSteps/Step1AddListing';
import { Step2EnterpriseModel } from './addListingSteps/Step2EnterpriseModel';
import { Step2CreateListing } from './addListingSteps/Step2CreateListing';
import { Step3SyncPortfolio } from './addListingSteps/Step3SyncPortfolio';
import { Step3Amenities } from './addListingSteps/Step3Amenities';
import { Step4Media } from './addListingSteps/Step4Media';
import { Step5PublishListing } from './addListingSteps/Step5PublishListing';
import './addListingSteps/addListingWizard.css';

/**
 * @typedef {Object} ListingData
 * @property {'Apartment'|'House'|''} propertyType
 * @property {'Rental'|'For Sale'|''} listingType
 * @property {boolean|null} lookingForRoommates
 * @property {{street: string, number: string, city: string}} address
 * @property {string} relation
 * @property {File|null} verificationDocument
 * @property {string} licenseNumber
 * @property {string} agencyName
 * @property {string} brokerFee
 * @property {string} managementCompanyName
 * @property {string} emergencyMaintenancePhone
 * @property {'SyncPortfolio'|'AddManualSingle'|''} onboardingMethod
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
    propertyType: '',
    listingType: '',
    lookingForRoommates: null,
    address: { street: '', number: '', city: '' },
    relation: '',
    verificationDocument: null,
    licenseNumber: '',
    agencyName: '',
    brokerFee: '',
    managementCompanyName: '',
    emergencyMaintenancePhone: '',
    onboardingMethod: '',
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

const formatPublishError = (err) => {
    const responseData = err?.response?.data;
    const apiErrors = responseData?.errors;

    if (Array.isArray(apiErrors)) {
        const message = apiErrors
            .map((entry) => entry?.msg || entry?.message)
            .filter(Boolean)
            .join(', ');
        if (message) return message;
    }

    return responseData?.message
        || responseData?.error
        || err?.message
        || 'Failed to publish listing.';
};

const AddListing = () => {
    const history = useHistory();
    const [step, setStep] = useState(1);
    const [data, setData] = useState(createInitialListingData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [enterpriseOnboardingMethod, setEnterpriseOnboardingMethod] = useState('');
    const usesEnterpriseModel = data.relation === 'property manager';
    const effectiveOnboardingMethod = usesEnterpriseModel
        ? (enterpriseOnboardingMethod || data.onboardingMethod)
        : '';
    const usesSyncPortfolioFlow = usesEnterpriseModel && effectiveOnboardingMethod === 'SyncPortfolio';
    const totalSteps = usesSyncPortfolioFlow ? 3 : (usesEnterpriseModel ? 6 : 5);
    const createListingStep = usesEnterpriseModel ? 3 : 2;
    const syncPortfolioStep = 3;
    const amenitiesStep = createListingStep + 1;
    const mediaStep = createListingStep + 2;
    const publishStep = createListingStep + 3;
    const progressForStep = (stepNumber) => Math.round((stepNumber / totalSteps) * 100);

    const updateData = (updates) => {
        if (Object.prototype.hasOwnProperty.call(updates, 'onboardingMethod')) {
            setEnterpriseOnboardingMethod(String(updates.onboardingMethod || ''));
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'relation') && updates.relation !== 'property manager') {
            setEnterpriseOnboardingMethod('');
        }

        setData((prev) => {
            const next = { ...prev, ...updates };
            if (Object.prototype.hasOwnProperty.call(updates, 'relation') && updates.relation !== 'property manager') {
                next.onboardingMethod = '';
            }
            return next;
        });
    };

    const nextStep = () => {
        setStep((prev) => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    useEffect(() => {
        setStep((prev) => Math.min(prev, totalSteps));
    }, [totalSteps]);

    const handleEnterpriseContinue = (selectedMethod) => {
        const normalizedMethod = selectedMethod === 'SyncPortfolio' ? 'SyncPortfolio' : 'AddManualSingle';
        setEnterpriseOnboardingMethod(normalizedMethod);
        setData((prev) => ({ ...prev, onboardingMethod: normalizedMethod }));
        setStep(3);
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
            `Looking for roommates: ${data.lookingForRoommates === null ? 'N/A' : (data.lookingForRoommates ? 'Yes' : 'No')}`,
            `Lease length: ${data.leaseLength || 'N/A'}`,
            `Deposit: ${data.deposit || 'N/A'}`,
        ];

        if (data.relation === 'property owner') {
            summaryRows.push(`Property verification document: ${data.verificationDocument?.name || 'Not uploaded'}`);
        }

        if (data.relation === 'agent/broker') {
            summaryRows.push(`License number: ${data.licenseNumber || 'N/A'}`);
            summaryRows.push(`Agency name: ${data.agencyName || 'N/A'}`);
            summaryRows.push(`Broker fee: ${data.brokerFee || 'N/A'}`);
        }

        if (data.relation === 'property manager') {
            summaryRows.push(`Management company: ${data.managementCompanyName || 'N/A'}`);
            summaryRows.push(`Emergency maintenance phone: ${data.emergencyMaintenancePhone || 'N/A'}`);
            summaryRows.push(`Onboarding method: ${effectiveOnboardingMethod || 'N/A'}`);
        }

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
            setStep(createListingStep);
            return;
        }

        setLoading(true);
        try {
            const result = await createProperty(payload);
            history.push(`/properties/${result.data._id}`);
        } catch (err) {
            setError(formatPublishError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="listing-wizard-shell">
            {error ? <p className="listing-wizard-status listing-wizard-status--error">{error}</p> : null}
            {loading ? <p className="listing-wizard-status listing-wizard-status--loading">Publishing listing...</p> : null}

            {step === 1 ? <Step1AddListing data={data} updateData={updateData} nextStep={nextStep} /> : null}
            {usesEnterpriseModel && step === 2 ? (
                <Step2EnterpriseModel
                    data={data}
                    updateData={updateData}
                    onContinue={handleEnterpriseContinue}
                    prevStep={prevStep}
                    totalSteps={totalSteps}
                />
            ) : null}
            {usesSyncPortfolioFlow && step === syncPortfolioStep ? (
                <Step3SyncPortfolio
                    prevStep={prevStep}
                    onDone={() => history.push('/')}
                    totalSteps={totalSteps}
                />
            ) : null}
            {!usesSyncPortfolioFlow && step === createListingStep ? (
                <Step2CreateListing
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    stepNumber={createListingStep}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(createListingStep)}
                />
            ) : null}
            {!usesSyncPortfolioFlow && step === amenitiesStep ? (
                <Step3Amenities
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    stepNumber={amenitiesStep}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(amenitiesStep)}
                />
            ) : null}
            {!usesSyncPortfolioFlow && step === mediaStep ? (
                <Step4Media
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    stepNumber={mediaStep}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(mediaStep)}
                />
            ) : null}
            {!usesSyncPortfolioFlow && step === publishStep ? (
                <Step5PublishListing
                    data={data}
                    prevStep={prevStep}
                    onPublishFinished={onPublishFinished}
                    stepNumber={publishStep}
                    totalSteps={totalSteps}
                />
            ) : null}
        </div>
    );
};

export default AddListing;
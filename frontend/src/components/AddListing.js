import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createProperty } from '../services/api';
import { Step0ProfileType } from './addListingSteps/Step0ProfileType';
import { Step1AddListing } from './addListingSteps/Step1AddListing';
import { Step2EnterpriseModel } from './addListingSteps/Step2EnterpriseModel';
import { Step2CreateListing } from './addListingSteps/Step2CreateListing';
import { Step3EnterpriseFeedConnect } from './addListingSteps/Step3EnterpriseFeedConnect';
import { Step3Amenities } from './addListingSteps/Step3Amenities';
import { Step4Media } from './addListingSteps/Step4Media';
import { Step5PublishListing } from './addListingSteps/Step5PublishListing';
import { Step6EnterpriseRouting } from './addListingSteps/Step6EnterpriseRouting';
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
    profileType: '',
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

const initialEnterpriseAgents = [
    { id: '1', name: 'Tomer S.', leadsPassed: 24, activeProperties: 8, conversionRate: '18%' },
    { id: '2', name: 'Shira L.', leadsPassed: 42, activeProperties: 6, conversionRate: '26%' },
    { id: '3', name: 'Maya R.', leadsPassed: 11, activeProperties: 4, conversionRate: '14%' },
];

const initialEnterpriseListings = [
    { id: 'a', address: 'Jaffa German Colony 12, Tel Aviv', source: 'Website', price: 24000, assignedAgentId: '1', boosterActive: true, leadsCount: 4 },
    { id: 'b', address: 'Florentin St. 4, Tel Aviv', source: 'Yad2', price: 7200, assignedAgentId: '2', boosterActive: false, leadsCount: 12 },
    { id: 'c', address: 'Rothschild Blvd 46, Tel Aviv', source: 'Facebook', price: 19000, assignedAgentId: '3', boosterActive: true, leadsCount: 8 },
];

const AddListing = () => {
    const history = useHistory();
    const [step, setStep] = useState(0);
    const [data, setData] = useState(createInitialListingData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [enterpriseOnboardingMethod, setEnterpriseOnboardingMethod] = useState('');
    const [enterpriseFeedUrl, setEnterpriseFeedUrl] = useState('');
    const [syncedPortfolioCount, setSyncedPortfolioCount] = useState(0);
    const [enterpriseListings, setEnterpriseListings] = useState(initialEnterpriseListings);
    const usesEnterpriseModel = data.relation === 'property manager';
    const effectiveOnboardingMethod = usesEnterpriseModel
        ? (enterpriseOnboardingMethod || data.onboardingMethod)
        : '';
    const usesSyncPortfolioFlow = usesEnterpriseModel && effectiveOnboardingMethod === 'SyncPortfolio';
    const usesManualEnterpriseFlow = usesEnterpriseModel && effectiveOnboardingMethod === 'AddManualSingle';
    const totalSteps = usesEnterpriseModel ? 7 : 6;
    const createListingStep = usesEnterpriseModel ? 3 : 2;
    const feedConnectStep = 3;
    const amenitiesStep = usesEnterpriseModel ? 4 : 3;
    const mediaStep = usesEnterpriseModel ? 5 : 4;
    const publishStep = usesEnterpriseModel ? 6 : 5;
    const progressForStep = (stepNumber) => Math.round((stepNumber / totalSteps) * 100);

    const updateData = (updates) => {
        if (Object.prototype.hasOwnProperty.call(updates, 'onboardingMethod')) {
            setEnterpriseOnboardingMethod(String(updates.onboardingMethod || ''));
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'relation') && updates.relation !== 'property manager') {
            setEnterpriseOnboardingMethod('');
            setEnterpriseFeedUrl('');
            setSyncedPortfolioCount(0);
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
        setStep((prev) => Math.max(prev - 1, 0));
    };

    const handleEnterpriseAgentChange = (listingId, agentId) => {
        setEnterpriseListings((prev) => prev.map((item) => (
            item.id === listingId ? { ...item, assignedAgentId: agentId } : item
        )));
    };

    const handleEnterpriseBoosterToggle = (listingId) => {
        setEnterpriseListings((prev) => prev.map((item) => (
            item.id === listingId ? { ...item, boosterActive: !item.boosterActive } : item
        )));
    };

    const handleEnterpriseLaunch = () => {
        window.alert(`Launching Enterprise Connect Suite across ${enterpriseListings.length} listings.`);
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
            const status = Number(err?.response?.status || 0);
            const apiMessage = String(err?.response?.data?.message || '');
            const isTokenAuthFailure = status === 401 && /token (invalid|expired)/i.test(apiMessage);
            if (isTokenAuthFailure) {
                setError('Your session expired while publishing. Please sign in again and then retry publishing.');
                return;
            }
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
        <div className="listing-wizard-shell">
            {error ? <p className="listing-wizard-status listing-wizard-status--error">{error}</p> : null}
            {loading ? <p className="listing-wizard-status listing-wizard-status--loading">Publishing listing...</p> : null}

            {step === 0 ? (
                <Step0ProfileType
                    profileType={data.profileType}
                    onSelectProfileType={(pt) => updateData({ profileType: pt })}
                    onContinue={nextStep}
                    totalSteps={totalSteps}
                />
            ) : null}
            {step === 1 ? <Step1AddListing data={data} updateData={updateData} nextStep={nextStep} stepNumber={2} totalSteps={totalSteps} /> : null}
            {usesEnterpriseModel && step === 2 ? (
                <Step2EnterpriseModel
                    data={data}
                    updateData={updateData}
                    onContinue={handleEnterpriseContinue}
                    prevStep={prevStep}
                    totalSteps={totalSteps}
                />
            ) : null}
            {usesSyncPortfolioFlow && step === feedConnectStep ? (
                <Step3EnterpriseFeedConnect
                    feedUrl={enterpriseFeedUrl}
                    onFeedUrlChange={setEnterpriseFeedUrl}
                    syncedCount={syncedPortfolioCount}
                    onSyncComplete={setSyncedPortfolioCount}
                    prevStep={prevStep}
                    nextStep={nextStep}
                    stepNumber={feedConnectStep + 1}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(feedConnectStep + 1)}
                />
            ) : null}
            {(!usesEnterpriseModel && step === createListingStep) || (usesManualEnterpriseFlow && step === createListingStep) ? (
                <Step2CreateListing
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    stepNumber={createListingStep + 1}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(createListingStep + 1)}
                />
            ) : null}
            {(usesManualEnterpriseFlow || usesSyncPortfolioFlow || !usesEnterpriseModel) && step === amenitiesStep ? (
                <Step3Amenities
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    stepNumber={amenitiesStep + 1}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(amenitiesStep + 1)}
                    isEnterpriseTrack={usesEnterpriseModel}
                />
            ) : null}
            {(usesManualEnterpriseFlow || usesSyncPortfolioFlow || !usesEnterpriseModel) && step === mediaStep ? (
                <Step4Media
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    prevStep={prevStep}
                    stepNumber={mediaStep + 1}
                    totalSteps={totalSteps}
                    progressPercent={progressForStep(mediaStep + 1)}
                    isEnterpriseTrack={usesEnterpriseModel}
                />
            ) : null}
            {!usesEnterpriseModel && step === publishStep ? (
                <Step5PublishListing
                    data={data}
                    prevStep={prevStep}
                    onPublishFinished={onPublishFinished}
                    stepNumber={publishStep + 1}
                    totalSteps={totalSteps}
                />
            ) : null}
            {usesEnterpriseModel && step === publishStep ? (
                <Step6EnterpriseRouting
                    agents={initialEnterpriseAgents}
                    listings={enterpriseListings}
                    syncedPortfolioCount={syncedPortfolioCount}
                    onboardingMethod={effectiveOnboardingMethod}
                    onAgentChange={handleEnterpriseAgentChange}
                    onToggleBooster={handleEnterpriseBoosterToggle}
                    prevStep={prevStep}
                    onLaunch={handleEnterpriseLaunch}
                    stepNumber={publishStep + 1}
                    totalSteps={totalSteps}
                />
            ) : null}
        </div>
    );
};

export default AddListing;
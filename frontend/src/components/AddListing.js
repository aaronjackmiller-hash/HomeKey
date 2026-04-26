import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createProperty } from '../services/api';
import {
    createInitialPropertyDraft,
    buildPropertyPayload,
    updateNestedFormValue,
    updateShowingValue,
    addShowingSlot as addShowingSlotDraft,
    removeShowingSlot as removeShowingSlotDraft,
} from '../utils/propertyDraft';

const AddListing = () => {
    const history = useHistory();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(createInitialPropertyDraft);

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateNestedFormValue(setFormData, name, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const payload = buildPropertyPayload(formData);

        try {
            const result = await createProperty(payload);
            history.push(`/properties/${result.data._id}`);
        } catch (err) {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                setError(apiErrors.map((e) => e.msg).join(', '));
            } else {
                setError(err.response?.data?.message || 'Failed to create listing.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShowingChange = (index, field, value) => {
        updateShowingValue(setFormData, index, field, value);
    };

    const addShowingSlot = () => {
        addShowingSlotDraft(setFormData);
    };

    const removeShowingSlot = (index) => {
        removeShowingSlotDraft(setFormData, index);
    };

    return (
        <div style={{ maxWidth: '700px', margin: '20px auto', padding: '0 20px' }}>
            <h2>Add New Listing</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <fieldset>
                    <legend>Basic Info</legend>
                    <div className="input-field">
                        <label>Title *</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                    </div>
                    <div className="input-field">
                        <label>Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Type *</label>
                        <select name="type" value={formData.type} onChange={handleChange} required>
                            <option value="sale">For Sale</option>
                            <option value="rental">Rental</option>
                        </select>
                    </div>
                    <div className="input-field">
                        <label>Price *</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" />
                    </div>
                    <div className="input-field">
                        <label>Bedrooms *</label>
                        <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} required min="0" />
                    </div>
                    <div className="input-field">
                        <label>Bathrooms *</label>
                        <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} required min="0" />
                    </div>
                    <div className="input-field">
                        <label>Size (sqm) *</label>
                        <input type="number" name="size" value={formData.size} onChange={handleChange} required min="0" />
                    </div>
                    <div className="input-field">
                        <label>Floor Number</label>
                        <input type="number" name="floorNumber" value={formData.floorNumber} onChange={handleChange} min="0" />
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Address</legend>
                    <div className="input-field">
                        <label>Street</label>
                        <input type="text" name="address_street" value={formData.address.street} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>City</label>
                        <input type="text" name="address_city" value={formData.address.city} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>State / Region</label>
                        <input type="text" name="address_state" value={formData.address.state} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Zip</label>
                        <input type="text" name="address_zip" value={formData.address.zip} onChange={handleChange} />
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Building Details</legend>
                    <div className="input-field">
                        <label>Building Name</label>
                        <input type="text" name="buildingDetails_name" value={formData.buildingDetails.name} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Floor Count</label>
                        <input type="number" name="buildingDetails_floorCount" value={formData.buildingDetails.floorCount} onChange={handleChange} min="0" />
                    </div>
                    <div className="input-field">
                        <label>Apartment Count</label>
                        <input type="number" name="buildingDetails_apartmentCount" value={formData.buildingDetails.apartmentCount} onChange={handleChange} min="0" />
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Financial Details</legend>
                    <div className="input-field">
                        <label>Total Monthly Payment</label>
                        <input type="number" name="financialDetails_totalMonthlyPayment" value={formData.financialDetails.totalMonthlyPayment} onChange={handleChange} min="0" />
                    </div>
                    <div className="input-field">
                        <label>Vaad (HOA) Amount</label>
                        <input type="number" name="financialDetails_vaadAmount" value={formData.financialDetails.vaadAmount} onChange={handleChange} min="0" />
                    </div>
                    <div className="input-field">
                        <label>City Taxes</label>
                        <input type="number" name="financialDetails_cityTaxes" value={formData.financialDetails.cityTaxes} onChange={handleChange} min="0" />
                    </div>
                    <div className="input-field">
                        <label>Maintenance Fees</label>
                        <input type="number" name="financialDetails_maintenanceFees" value={formData.financialDetails.maintenanceFees} onChange={handleChange} min="0" />
                    </div>
                    <div className="input-field">
                        <label>Property Tax</label>
                        <input type="number" name="financialDetails_propertyTax" value={formData.financialDetails.propertyTax} onChange={handleChange} min="0" />
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Dates</legend>
                    <div className="input-field">
                        <label>Available From</label>
                        <input type="date" name="dates_availableFrom" value={formData.dates.availableFrom} onChange={handleChange} />
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Owner Contact (for buyers/renters)</legend>
                    <div className="input-field">
                        <label>Contact Name</label>
                        <input type="text" name="contact_name" value={formData.contact.name} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Contact Email</label>
                        <input type="email" name="contact_email" value={formData.contact.email} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Contact Phone</label>
                        <input type="tel" name="contact_phone" value={formData.contact.phone} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Contact WhatsApp</label>
                        <input type="tel" name="contact_whatsapp" value={formData.contact.whatsapp} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>Preferred Contact Method</label>
                        <select name="contact_preferredMethod" value={formData.contact.preferredMethod} onChange={handleChange}>
                            <option value="email">Email</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="phone">Phone</option>
                        </select>
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Listing Expiry</legend>
                    <div className="input-field">
                        <label>Expires At (optional override)</label>
                        <input type="date" name="lifecycle_expiresAt" value={formData.lifecycle.expiresAt} onChange={handleChange} />
                    </div>
                    <div className="input-field">
                        <label>
                            <input
                                type="checkbox"
                                name="lifecycle_autoExpireEnabled"
                                checked={Boolean(formData.lifecycle.autoExpireEnabled)}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        lifecycle: {
                                            ...prev.lifecycle,
                                            autoExpireEnabled: e.target.checked,
                                        },
                                    }))
                                }
                            />
                            Enable automatic expiry/reminders
                        </label>
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Showing Schedule</legend>
                    {formData.showings.map((showing, index) => (
                        <div key={`showing-${index}`} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                            <div className="input-field">
                                <label>Start Date/Time</label>
                                <input
                                    type="datetime-local"
                                    value={showing.startsAt}
                                    onChange={(e) => handleShowingChange(index, 'startsAt', e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <label>End Date/Time</label>
                                <input
                                    type="datetime-local"
                                    value={showing.endsAt}
                                    onChange={(e) => handleShowingChange(index, 'endsAt', e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <label>Attendee Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={showing.attendeeLimit}
                                    onChange={(e) => handleShowingChange(index, 'attendeeLimit', e.target.value)}
                                />
                            </div>
                            <div className="input-field">
                                <label>Notes</label>
                                <input
                                    type="text"
                                    value={showing.notes}
                                    onChange={(e) => handleShowingChange(index, 'notes', e.target.value)}
                                />
                            </div>
                            {formData.showings.length > 1 && (
                                <button type="button" onClick={() => removeShowingSlot(index)}>Remove Time Slot</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addShowingSlot}>+ Add Showing Time</button>
                </fieldset>
                <button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit Listing'}</button>
                <button type="button" onClick={() => history.push('/')} style={{ marginLeft: '12px' }}>Cancel</button>
            </form>
        </div>
    );
};

export default AddListing;
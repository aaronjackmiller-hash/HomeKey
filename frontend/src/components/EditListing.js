import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { getProperty, updateProperty } from '../services/api';

const EditListing = () => {
    const { id } = useParams();
    const history = useHistory();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'sale',
        price: '',
        bedrooms: '',
        bathrooms: '',
        size: '',
        floorNumber: '',
        address: {
            street: '',
            city: '',
            state: '',
            zip: '',
        },
        buildingDetails: {
            name: '',
            floorCount: '',
            apartmentCount: '',
        },
        financialDetails: {
            totalMonthlyPayment: '',
            vaadAmount: '',
            cityTaxes: '',
            maintenanceFees: '',
            propertyTax: '',
        },
        dates: {
            availableFrom: '',
        },
    });

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const result = await getProperty(id);
                const p = result.data;
                setFormData({
                    title: p.title || '',
                    description: p.description || '',
                    type: p.type || 'sale',
                    price: p.price != null ? String(p.price) : '',
                    bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
                    bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
                    size: p.size != null ? String(p.size) : '',
                    floorNumber: p.floorNumber != null ? String(p.floorNumber) : '',
                    address: {
                        street: p.address?.street || '',
                        city: p.address?.city || '',
                        state: p.address?.state || '',
                        zip: p.address?.zip || '',
                    },
                    buildingDetails: {
                        name: p.buildingDetails?.name || '',
                        floorCount: p.buildingDetails?.floorCount != null ? String(p.buildingDetails.floorCount) : '',
                        apartmentCount: p.buildingDetails?.apartmentCount != null ? String(p.buildingDetails.apartmentCount) : '',
                    },
                    financialDetails: {
                        totalMonthlyPayment: p.financialDetails?.totalMonthlyPayment != null ? String(p.financialDetails.totalMonthlyPayment) : '',
                        vaadAmount: p.financialDetails?.vaadAmount != null ? String(p.financialDetails.vaadAmount) : '',
                        cityTaxes: p.financialDetails?.cityTaxes != null ? String(p.financialDetails.cityTaxes) : '',
                        maintenanceFees: p.financialDetails?.maintenanceFees != null ? String(p.financialDetails.maintenanceFees) : '',
                        propertyTax: p.financialDetails?.propertyTax != null ? String(p.financialDetails.propertyTax) : '',
                    },
                    dates: {
                        availableFrom: p.dates?.availableFrom ? p.dates.availableFrom.slice(0, 10) : '',
                    },
                });
            } catch (err) {
                setError('Failed to load property data.');
            } finally {
                setFetching(false);
            }
        };
        fetchProperty();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const parts = name.split('_');
        if (parts.length === 2) {
            const [group, field] = parts;
            setFormData((prev) => ({
                ...prev,
                [group]: { ...prev[group], [field]: value },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const payload = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            price: Number(formData.price),
            bedrooms: Number(formData.bedrooms),
            bathrooms: Number(formData.bathrooms),
            size: Number(formData.size),
            ...(formData.floorNumber !== '' && { floorNumber: Number(formData.floorNumber) }),
            address: formData.address,
            buildingDetails: {
                name: formData.buildingDetails.name,
                ...(formData.buildingDetails.floorCount !== '' && { floorCount: Number(formData.buildingDetails.floorCount) }),
                ...(formData.buildingDetails.apartmentCount !== '' && { apartmentCount: Number(formData.buildingDetails.apartmentCount) }),
            },
            financialDetails: Object.fromEntries(
                Object.entries(formData.financialDetails)
                    .filter(([, v]) => v !== '')
                    .map(([k, v]) => [k, Number(v)])
            ),
            dates: {
                ...(formData.dates.availableFrom && { availableFrom: formData.dates.availableFrom }),
            },
        };

        try {
            await updateProperty(id, payload);
            history.push(`/properties/${id}`);
        } catch (err) {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                setError(apiErrors.map((e) => e.msg).join(', '));
            } else {
                setError(err.response?.data?.message || 'Failed to update listing.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <p>Loading…</p>;

    return (
        <div style={{ maxWidth: '700px', margin: '20px auto', padding: '0 20px' }}>
            <h2>Edit Listing</h2>
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
                <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" onClick={() => history.push(`/properties/${id}`)} style={{ marginLeft: '12px' }}>Cancel</button>
            </form>
        </div>
    );
};

export default EditListing;

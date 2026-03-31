import React, { useState } from 'react';

const AddListing = () => {
    const [formData, setFormData] = useState({
        buildingDetails: {
            name: '',
            address: '',
            floorCount: '',
            apartmentCount: '',
        },
        financialDetails: {
            price: '',
            maintenanceFees: '',
            propertyTax: '',
        },
        dates: {
            availableFrom: '',
            listingDate: '',
        },
        propertyInfo: {
            type: '',
            size: '',
            bedrooms: '',
            bathrooms: '',
        }
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        const [group, field] = name.split('_');
        setFormData(prev => ({
            ...prev,
            [group]: {
                ...prev[group],
                [field]: value
            }
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        // Submit logic here
        console.log(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <fieldset>
                <legend>Building Details</legend>
                <label>
                    Name:
                    <input type="text" name="buildingDetails_name" value={formData.buildingDetails.name} onChange={handleChange} />
                </label>
                <label>
                    Address:
                    <input type="text" name="buildingDetails_address" value={formData.buildingDetails.address} onChange={handleChange} />
                </label>
                <label>
                    Floor Count:
                    <input type="number" name="buildingDetails_floorCount" value={formData.buildingDetails.floorCount} onChange={handleChange} />
                </label>
                <label>
                    Apartment Count:
                    <input type="number" name="buildingDetails_apartmentCount" value={formData.buildingDetails.apartmentCount} onChange={handleChange} />
                </label>
            </fieldset>
            <fieldset>
                <legend>Financial Details</legend>
                <label>
                    Price:
                    <input type="number" name="financialDetails_price" value={formData.financialDetails.price} onChange={handleChange} />
                </label>
                <label>
                    Maintenance Fees:
                    <input type="number" name="financialDetails_maintenanceFees" value={formData.financialDetails.maintenanceFees} onChange={handleChange} />
                </label>
                <label>
                    Property Tax:
                    <input type="number" name="financialDetails_propertyTax" value={formData.financialDetails.propertyTax} onChange={handleChange} />
                </label>
            </fieldset>
            <fieldset>
                <legend>Dates</legend>
                <label>
                    Available From:
                    <input type="date" name="dates_availableFrom" value={formData.dates.availableFrom} onChange={handleChange} />
                </label>
                <label>
                    Listing Date:
                    <input type="date" name="dates_listingDate" value={formData.dates.listingDate} onChange={handleChange} />
                </label>
            </fieldset>
            <fieldset>
                <legend>Property Information</legend>
                <label>
                    Type:
                    <input type="text" name="propertyInfo_type" value={formData.propertyInfo.type} onChange={handleChange} />
                </label>
                <label>
                    Size:
                    <input type="number" name="propertyInfo_size" value={formData.propertyInfo.size} onChange={handleChange} />
                </label>
                <label>
                    Bedrooms:
                    <input type="number" name="propertyInfo_bedrooms" value={formData.propertyInfo.bedrooms} onChange={handleChange} />
                </label>
                <label>
                    Bathrooms:
                    <input type="number" name="propertyInfo_bathrooms" value={formData.propertyInfo.bathrooms} onChange={handleChange} />
                </label>
            </fieldset>
            <button type="submit">Submit Listing</button>
        </form>
    );
};

export default AddListing;
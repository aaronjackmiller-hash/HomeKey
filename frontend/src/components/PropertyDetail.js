import React from 'react';

const PropertyDetail = ({ property }) => {
    return (
        <div className="property-detail">
            <h1>{property.title}</h1>
            <div className="image-gallery">
                {property.images.map((image, index) => (
                    <img key={index} src={image} alt={`Property Image ${index + 1}`} />
                ))}
            </div>
            <div className="specs">
                <h2>Specifications</h2>
                <p>{property.specs}</p>
            </div>
            <div className="financials">
                <h2>Financials</h2>
                <p>{property.financials}</p>
            </div>
            <div className="availability">
                <h2>Availability</h2>
                <p>{property.availability}</p>
            </div>
            <div className="agent-contact">
                <h2>Contact Agent</h2>
                <p>{property.agent.name}</p>
                <p>{property.agent.phone}</p>
                <p>{property.agent.email}</p>
            </div>
        </div>
    );
};

export default PropertyDetail;

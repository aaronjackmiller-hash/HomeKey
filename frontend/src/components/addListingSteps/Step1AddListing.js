import React from 'react';

export const Step1AddListing = ({ data, updateData, nextStep }) => {
    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Step 1: Add your listing</h2>
                <span className="text-xs font-medium text-gray-400">Step 1 of 5</span>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Property Type</label>
                <div className="grid grid-cols-2 gap-4">
                    {['Apartment', 'House'].map((type) => (
                        <button
                            type="button"
                            key={type}
                            onClick={() => updateData({ propertyType: type })}
                            className={`p-4 rounded-xl border text-center transition-all ${
                                data.propertyType === type
                                    ? 'border-slate-900 bg-slate-50/50 font-medium text-slate-900'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Listing Purpose</label>
                <select
                    value={data.listingType}
                    onChange={(e) => updateData({ listingType: e.target.value })}
                    className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-slate-900"
                >
                    <option value="Rental">Rental</option>
                    <option value="For Sale">For Sale</option>
                </select>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="block text-sm font-medium text-gray-800 mb-2">Are you looking for roommates?</label>
                <select
                    value={data.lookingForRoommates ? 'Yes' : 'No'}
                    onChange={(e) => updateData({ lookingForRoommates: e.target.value === 'Yes' })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none"
                >
                    <option value="No">No, not searching (Entire property)</option>
                    <option value="Yes">Yes, searching (Shared living space)</option>
                </select>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Address</label>
                <div className="grid grid-cols-3 gap-3">
                    <input
                        type="text"
                        placeholder="Street"
                        value={data.address.street}
                        onChange={(e) => updateData({ address: { ...data.address, street: e.target.value } })}
                        className="col-span-1 p-3 rounded-lg border border-gray-200 text-sm"
                    />
                    <input
                        type="text"
                        placeholder="No."
                        value={data.address.number}
                        onChange={(e) => updateData({ address: { ...data.address, number: e.target.value } })}
                        className="col-span-1 p-3 rounded-lg border border-gray-200 text-sm"
                    />
                    <input
                        type="text"
                        placeholder="City"
                        value={data.address.city}
                        onChange={(e) => updateData({ address: { ...data.address, city: e.target.value } })}
                        className="col-span-1 p-3 rounded-lg border border-gray-200 text-sm"
                    />
                </div>
            </div>

            <div className="mb-8">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Which best describes your relation to this listing?
                </label>
                <select
                    value={data.relation}
                    onChange={(e) => updateData({ relation: e.target.value })}
                    className="w-full p-3 rounded-lg border border-gray-200 text-sm"
                >
                    <option value="">Select option...</option>
                    <option value="renter">Renter</option>
                    <option value="property owner">Property Owner</option>
                    <option value="agent/broker">Agent/Broker listing on someone&apos;s behalf</option>
                    <option value="property manager">Property Manager</option>
                </select>
            </div>

            <button
                type="button"
                onClick={nextStep}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-medium tracking-wide hover:bg-slate-800 transition-colors"
            >
                Continue to Step 2
            </button>
        </div>
    );
};

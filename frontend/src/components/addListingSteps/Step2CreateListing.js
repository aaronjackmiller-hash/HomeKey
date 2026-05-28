import React from 'react';

export const Step2CreateListing = ({ data, updateData, nextStep, prevStep }) => {
    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Step 2: Create a listing</h2>
                <span className="text-xs font-medium text-gray-400">Step 2 of 5</span>
            </div>

            <div className="mb-6 p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs rounded-lg font-medium flex items-center gap-2">
                <span>✓ Verified Address:</span>
                <span>
                    {data.address.street} {data.address.number}, {data.address.city || '(Address not specified)'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Number of bedrooms</label>
                    <select
                        value={data.bedrooms}
                        onChange={(e) => updateData({ bedrooms: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                    >
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Number of bathrooms</label>
                    <select
                        value={data.bathrooms}
                        onChange={(e) => updateData({ bathrooms: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                    >
                        {[1, 1.5, 2, 2.5, 3].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                    <div className="relative flex items-center">
                        <input
                            type="number"
                            placeholder="Size"
                            value={data.sizeSqm}
                            onChange={(e) => updateData({ sizeSqm: e.target.value })}
                            className="w-full p-2.5 pr-12 rounded-lg border border-gray-200 text-sm"
                        />
                        <span className="absolute right-3 text-xs font-semibold text-gray-400">SQM</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date available</label>
                    <input
                        type="date"
                        value={data.dateAvailable}
                        onChange={(e) => updateData({ dateAvailable: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-sm text-gray-600"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Total Monthly Price</label>
                    <div className="relative flex items-center">
                        <span className="absolute left-3 font-semibold text-gray-500">₪</span>
                        <input
                            type="text"
                            placeholder="ex. 2,500"
                            value={data.price}
                            onChange={(e) => updateData({ price: e.target.value })}
                            className="w-full p-2.5 pl-8 rounded-lg border border-gray-200 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Deposit</label>
                    <div className="relative flex items-center">
                        <span className="absolute left-3 font-semibold text-gray-500">₪</span>
                        <input
                            type="text"
                            value={data.deposit}
                            onChange={(e) => updateData({ deposit: e.target.value })}
                            className="w-full p-2.5 pl-8 rounded-lg border border-gray-200 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Lease length</label>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            placeholder="ex. 12"
                            value={data.leaseLength}
                            onChange={(e) => updateData({ leaseLength: e.target.value })}
                            className="w-full p-2.5 pr-16 rounded-lg border border-gray-200 text-sm"
                        />
                        <span className="absolute right-3 text-xs text-gray-400 font-medium">Months</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Floor Number</label>
                    <input
                        type="number"
                        placeholder="Floor"
                        value={data.floorNumber}
                        onChange={(e) => updateData({ floorNumber: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                    />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                    rows={4}
                    placeholder="Provide key details, unique features, and the lifestyle potential..."
                    maxLength={7000}
                    value={data.description}
                    onChange={(e) => updateData({ description: e.target.value })}
                    className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:outline-none"
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                    {7000 - (data.description?.length || 0)} characters remaining
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-200"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium tracking-wide text-sm hover:bg-slate-800"
                >
                    Continue to Step 3
                </button>
            </div>
        </div>
    );
};

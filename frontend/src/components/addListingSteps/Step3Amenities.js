import React from 'react';

export const Step3Amenities = ({ data, updateData, nextStep, prevStep }) => {
    const allAmenities = [
        { id: 'EL', label: 'Elevator' },
        { id: 'PK', label: 'Parking' },
        { id: 'PT', label: 'Pets Allowed' },
        { id: 'DA', label: 'Disabled Access' },
        { id: 'RN', label: 'Renovated' },
        { id: 'FR', label: 'Furnished' },
        { id: 'AC', label: 'Air Conditioning' },
        { id: 'WB', label: 'Bars on Windows' },
        { id: 'MP', label: 'Mirpeset (Balcony)' },
        { id: 'SU', label: 'Suitable for Partners' },
        { id: 'MM', label: 'The Mamad (Security Room)' },
    ];

    const toggleAmenity = (label) => {
        const current = data.amenities || [];
        const updated = current.includes(label)
            ? current.filter((item) => item !== label)
            : [...current, label];
        updateData({ amenities: updated });
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Step 3: Amenities</h2>
                <span className="text-xs font-medium text-gray-400">Step 3 of 5</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
                {allAmenities.map((item) => {
                    const isSelected = (data.amenities || []).includes(item.label);
                    return (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => toggleAmenity(item.label)}
                            className={`p-3.5 flex items-center gap-3 rounded-lg border text-left transition-all ${
                                isSelected
                                    ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                                    isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-gray-50 text-gray-400 border-gray-200'
                                }`}
                            >
                                {item.id}
                            </span>
                            <span className="text-sm">{item.label}</span>
                        </button>
                    );
                })}
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
                    Continue to Step 4
                </button>
            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';

export const Step5PublishListing = ({ data, prevStep, onPublishFinished }) => {
    const [primaryImageSrc, setPrimaryImageSrc] = useState('');
    const [displayPhone, setDisplayPhone] = useState(true);

    useEffect(() => {
        if (data.mediaFiles && data.mediaFiles.length > 0) {
            const objectUrl = URL.createObjectURL(data.mediaFiles[0]);
            setPrimaryImageSrc(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
        setPrimaryImageSrc('');
        return undefined;
    }, [data.mediaFiles]);

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Step 5: Publish listing!</h2>
                <span className="text-xs font-medium text-gray-400">Step 5 of 5</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Your listing is almost ready!</p>

            <div className="mb-6 border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="relative aspect-video bg-gray-100 border-b border-gray-100">
                    {primaryImageSrc ? (
                        <img src={primaryImageSrc} alt="Primary Listing Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                            <span className="text-xs font-medium">No photos uploaded yet</span>
                        </div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                        {data.listingType || 'Rental'}
                    </span>
                </div>

                <div className="p-5">
                    <div className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1">
                        {data.propertyType || 'Apartment'} in {data.address.city || 'Tel Aviv-Yafo'}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                        ₪{data.price ? Number(String(data.price).replace(/,/g, '')).toLocaleString() : '0'}{' '}
                        <span className="text-xs font-normal text-gray-500">/ month</span>
                    </h3>

                    <div className="text-sm font-medium text-gray-800 mb-3">
                        📍 {data.address.street || 'Street'} {data.address.number || ''}, {data.address.city || 'City'}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 border-t border-b border-gray-100 py-2.5 mb-4">
                        <div>🛏️ <span className="text-slate-900 font-bold">{data.bedrooms || '0'}</span> Rooms</div>
                        <div>🚿 <span className="text-slate-900 font-bold">{data.bathrooms || '0'}</span> Baths</div>
                        <div>📐 <span className="text-slate-900 font-bold">{data.sizeSqm || '0'}</span> SQM</div>
                        <div>⏳ <span className="text-slate-900 font-bold">{data.leaseLength || '0'}</span> Mos</div>
                    </div>

                    {data.description && (
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Description Extract</p>
                            <p className="text-xs text-gray-600 line-clamp-2 italic">&quot;{data.description}&quot;</p>
                        </div>
                    )}

                    {data.amenities && data.amenities.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Amenities Added</p>
                            <div className="flex flex-wrap gap-1">
                                {data.amenities.map((amenity) => (
                                    <span key={amenity} className="text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 mb-6 border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={displayPhone}
                        onChange={(e) => setDisplayPhone(e.target.checked)}
                        className="rounded border-gray-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-700">Display my phone number on the listing</span>
                </label>
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
                    onClick={onPublishFinished}
                    className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-semibold tracking-wide text-sm hover:bg-slate-800 transition-colors text-center"
                >
                    Go Live! Publish Listing
                </button>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-3">
                Your listing will process and launch live across platform filters inside 15 minutes.
            </p>
        </div>
    );
};

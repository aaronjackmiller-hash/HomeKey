import React, { useEffect, useState } from 'react';

export const Step4Media = ({ data, updateData, nextStep, prevStep }) => {
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        const mediaPreviews = (data.mediaFiles || []).map((file) => URL.createObjectURL(file));
        setPreviews(mediaPreviews);

        return () => {
            mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [data.mediaFiles]);

    const handleFileChange = (e) => {
        if (!e.target.files) {
            return;
        }
        const filesArray = Array.from(e.target.files);
        updateData({ mediaFiles: [...(data.mediaFiles || []), ...filesArray] });
        e.target.value = '';
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Step 4: Add your media</h2>
                <span className="text-xs font-medium text-gray-400">Step 4 of 5</span>
            </div>

            <div className="mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-100 text-xs rounded-lg font-medium">
                <strong>Note:</strong> The first picture uploaded will automatically serve as the primary banner image for the live listing display.
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-slate-400 transition-colors mb-6 relative">
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="text-gray-500 text-sm">
                    <p className="font-medium text-slate-900 mb-1">Click to upload, or drag files here...</p>
                    <p className="text-xs text-gray-400">(Supported formats: GIF, PNG, JPEG | Max 75MB total)</p>
                </div>
            </div>

            {previews.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Uploaded Images Gallery</p>
                    <div className="grid grid-cols-4 gap-2">
                        {previews.map((src, idx) => (
                            <div key={src} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
                                <img src={src} alt="Preview" className="object-cover w-full h-full" />
                                {idx === 0 && (
                                    <span className="absolute bottom-1 left-1 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                        Primary
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-8">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">3D Virtual Tour URL</label>
                <input
                    type="text"
                    placeholder="https://my.matterport.com/show/?m=..."
                    value={data.virtualTourUrl}
                    onChange={(e) => updateData({ virtualTourUrl: e.target.value })}
                    className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:outline-none"
                />
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
                    Continue to Step 5
                </button>
            </div>
        </div>
    );
};

const createEmptyShowingSlot = () => ({
  startsAt: '',
  endsAt: '',
  notes: '',
  attendeeLimit: 20,
});

export const createInitialPropertyDraft = () => ({
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
  contact: {
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    preferredMethod: 'email',
  },
  lifecycle: {
    expiresAt: '',
    autoExpireEnabled: true,
  },
  showings: [createEmptyShowingSlot()],
  status: 'active',
});

export const formatPropertyForEditForm = (property) => ({
  title: property.title || '',
  description: property.description || '',
  type: property.type || 'sale',
  price: property.price != null ? String(property.price) : '',
  bedrooms: property.bedrooms != null ? String(property.bedrooms) : '',
  bathrooms: property.bathrooms != null ? String(property.bathrooms) : '',
  size: property.size != null ? String(property.size) : '',
  floorNumber: property.floorNumber != null ? String(property.floorNumber) : '',
  address: {
    street: property.address?.street || '',
    city: property.address?.city || '',
    state: property.address?.state || '',
    zip: property.address?.zip || '',
  },
  buildingDetails: {
    name: property.buildingDetails?.name || '',
    floorCount: property.buildingDetails?.floorCount != null ? String(property.buildingDetails.floorCount) : '',
    apartmentCount: property.buildingDetails?.apartmentCount != null ? String(property.buildingDetails.apartmentCount) : '',
  },
  financialDetails: {
    totalMonthlyPayment: property.financialDetails?.totalMonthlyPayment != null ? String(property.financialDetails.totalMonthlyPayment) : '',
    vaadAmount: property.financialDetails?.vaadAmount != null ? String(property.financialDetails.vaadAmount) : '',
    cityTaxes: property.financialDetails?.cityTaxes != null ? String(property.financialDetails.cityTaxes) : '',
    maintenanceFees: property.financialDetails?.maintenanceFees != null ? String(property.financialDetails.maintenanceFees) : '',
    propertyTax: property.financialDetails?.propertyTax != null ? String(property.financialDetails.propertyTax) : '',
  },
  dates: {
    availableFrom: property.dates?.availableFrom
      ? new Date(property.dates.availableFrom).toISOString().split('T')[0]
      : '',
  },
  contact: {
    name: property.contact?.name || '',
    email: property.contact?.email || '',
    phone: property.contact?.phone || '',
    whatsapp: property.contact?.whatsapp || '',
    preferredMethod: property.contact?.preferredMethod || 'email',
  },
  lifecycle: {
    expiresAt: property.lifecycle?.expiresAt
      ? new Date(property.lifecycle.expiresAt).toISOString().split('T')[0]
      : '',
    autoExpireEnabled: property.lifecycle?.autoExpireEnabled !== false,
  },
  showings: Array.isArray(property.showings) && property.showings.length > 0
    ? property.showings.map((showing) => ({
      startsAt: showing.startsAt ? new Date(showing.startsAt).toISOString().slice(0, 16) : '',
      endsAt: showing.endsAt ? new Date(showing.endsAt).toISOString().slice(0, 16) : '',
      notes: showing.notes || '',
      attendeeLimit: showing.attendeeLimit || 20,
    }))
    : [createEmptyShowingSlot()],
  status: property.status || 'active',
});

export const buildPropertyPayload = (formData) => {
  const normalizedShowings = (formData.showings || [])
    .filter((showing) => showing.startsAt && showing.endsAt)
    .map((showing) => ({
      startsAt: showing.startsAt,
      endsAt: showing.endsAt,
      notes: showing.notes,
      attendeeLimit: Number(showing.attendeeLimit) || 20,
    }));

  return {
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
        .map(([k, v]) => [k, Number(v)]),
    ),
    dates: {
      ...(formData.dates.availableFrom && { availableFrom: formData.dates.availableFrom }),
    },
    contact: {
      ...formData.contact,
    },
    lifecycle: {
      ...(formData.lifecycle.expiresAt && { expiresAt: formData.lifecycle.expiresAt }),
      autoExpireEnabled: !!formData.lifecycle.autoExpireEnabled,
    },
    showings: normalizedShowings,
    status: formData.status,
  };
};

export const updateNestedFormValue = (setFormData, name, value) => {
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

export const updateShowingValue = (setFormData, index, field, value) => {
  setFormData((prev) => ({
    ...prev,
    showings: prev.showings.map((showing, i) =>
      i === index ? { ...showing, [field]: value } : showing),
  }));
};

export const addShowingSlot = (setFormData) => {
  setFormData((prev) => ({
    ...prev,
    showings: [...prev.showings, createEmptyShowingSlot()],
  }));
};

export const removeShowingSlot = (setFormData, index) => {
  setFormData((prev) => ({
    ...prev,
    showings: prev.showings.filter((_, i) => i !== index),
  }));
};

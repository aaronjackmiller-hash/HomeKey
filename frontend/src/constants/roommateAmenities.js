export const ROOMMATE_AMENITY_OPTIONS = [
  { value: 'mamad', label: 'Mamad', labelHe: 'ממ״ד', icon: 'shield', emoji: '🛡️' },
  { value: 'elevator', label: 'Elevator', labelHe: 'מעלית', icon: 'elevator', emoji: '🛗' },
  { value: 'parking', label: 'Parking', labelHe: 'חניה', icon: 'parking', emoji: '🚗' },
  { value: 'pets', label: 'Pets Allowed', labelHe: 'מתאים לחיות מחמד', icon: 'pets', emoji: '🐾' },
  { value: 'disabled-access', label: 'Disabled Access', labelHe: 'נגישות', icon: 'accessibility', emoji: '♿' },
  { value: 'renovated', label: 'Renovated', labelHe: 'משופץ', icon: 'renovated', emoji: '🔨' },
  { value: 'furnished', label: 'Furnished', labelHe: 'מרוהט', icon: 'furnished', emoji: '🛋️' },
  { value: 'oven', label: 'Oven', labelHe: 'תנור', icon: 'oven', emoji: '🍳' },
  { value: 'balcony', label: 'Balcony', labelHe: 'מרפסת', icon: 'balcony', emoji: '🌇' },
  { value: 'stovetop', label: 'Stovetop', labelHe: 'כיריים', icon: 'stovetop', emoji: '🔥' },
  { value: 'laundry-facilities', label: 'Laundry Facilities', labelHe: 'מתקני כביסה', icon: 'laundry', emoji: '🧺' },
  { value: 'dishwasher', label: 'Dishwasher', labelHe: 'מדיח כלים', icon: 'dishwasher', emoji: '🍽️' },
];

export const ROOMMATE_AMENITY_LABELS = ROOMMATE_AMENITY_OPTIONS.reduce((labels, option) => {
  labels[option.value] = { icon: option.emoji, label: option.label };
  return labels;
}, {});

export const LEGACY_ROOMMATE_AMENITY_LABELS = {
  'in-unit-washer-dryer': { icon: '🧺', label: 'Laundry Facilities' },
};

const ROOMMATE_AMENITY_VALUE_ALIASES = ROOMMATE_AMENITY_OPTIONS.reduce((aliases, option) => {
  aliases[option.value] = option.value;
  aliases[option.label.toLowerCase()] = option.value;
  aliases[option.labelHe] = option.value;
  return aliases;
}, {
  'pets ok': 'pets',
  accessible: 'disabled-access',
  laundry: 'laundry-facilities',
  'washer/dryer': 'laundry-facilities',
  'in-unit washer & dryer': 'laundry-facilities',
  'in-unit-washer-dryer': 'laundry-facilities',
  'mirpeset (balcony)': 'balcony',
  'the mamad (security room)': 'mamad',
});

export const normalizeRoommateAmenityValue = (value) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  return ROOMMATE_AMENITY_VALUE_ALIASES[normalizedValue]
    || ROOMMATE_AMENITY_VALUE_ALIASES[normalizedValue.toLowerCase()]
    || normalizedValue.toLowerCase();
};

export const normalizeRoommateAmenityList = (values = []) => {
  if (!Array.isArray(values)) return [];
  const allowedValues = new Set(ROOMMATE_AMENITY_OPTIONS.map((option) => option.value));
  return Array.from(new Set(values
    .map(normalizeRoommateAmenityValue)
    .filter((value) => allowedValues.has(value))));
};

export const getRoommateAmenityLabel = (value, language = 'en') => {
  const normalizedValue = normalizeRoommateAmenityValue(value);
  const option = ROOMMATE_AMENITY_OPTIONS.find((item) => item.value === normalizedValue);
  if (!option) return normalizedValue;
  return language === 'he' ? option.labelHe : option.label;
};

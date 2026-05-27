const normalizeSourceValue = (value) => String(value || '').trim();

export const isYad2ImageSource = (url, sourceType = '') => {
  const imageUrl = normalizeSourceValue(url).toLowerCase();
  const source = normalizeSourceValue(sourceType).toLowerCase();
  return imageUrl.includes('yad2') || source.includes('yad2');
};

export const buildYad2TopCroppedImageUrl = (url, sourceType = '') => {
  const source = normalizeSourceValue(url);
  if (!source) return '';
  if (!isYad2ImageSource(source, sourceType)) return source;
  try {
    const parsed = new URL(source);
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('crop', 'top');
    parsed.searchParams.set('h', '620');
    parsed.searchParams.set('w', '1200');
    return parsed.toString();
  } catch (_err) {
    const separator = source.includes('?') ? '&' : '?';
    return `${source}${separator}fit=crop&crop=top&h=620&w=1200`;
  }
};

export default buildYad2TopCroppedImageUrl;

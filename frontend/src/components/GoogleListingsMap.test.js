import { toMapMarkerInput } from './GoogleListingsMap';

describe('toMapMarkerInput', () => {
  it('keeps roommate listings without saved coordinates by building an address query', () => {
    const listing = {
      _id: 'roommate-1',
      address: {
        street: 'Rothschild Blvd',
        streetNumber: '55',
        city: 'Tel Aviv',
        country: 'Israel',
      },
      rentShare: 3200,
    };

    expect(toMapMarkerInput(listing, 'en', true)).toEqual({
      property: listing,
      propertyId: 'roommate-1',
      coords: null,
      addressQuery: '55 Rothschild Blvd, Tel Aviv, Israel',
    });
  });

  it('uses saved roommate coordinates without forcing another geocode', () => {
    const listing = {
      _id: 'roommate-2',
      address: {
        city: 'Jerusalem',
        country: 'Israel',
        lat: 31.7683,
        lng: 35.2137,
      },
      rentShare: 2800,
    };

    expect(toMapMarkerInput(listing, 'en', true)).toEqual({
      property: listing,
      propertyId: 'roommate-2',
      coords: { lat: 31.7683, lng: 35.2137 },
      addressQuery: '',
    });
  });
});

## Navbar.js — One-line fix for the filter panel hole

Find this line (~line 780 in Navbar.js):

```jsx
className={`premium-header__filters-panel ${filtersExpanded ? 'is-open' : ''} is-mobile-sheet`}
```

Replace it with:

```jsx
className={`premium-header__filters-panel ${filtersExpanded ? 'is-open' : ''} is-mobile-sheet`}
style={{ background: 'var(--color-surface, #fff)', isolation: 'isolate' }}
```

This gives the filter panel a solid background so the page content
beneath it does not show through the sticky header area.

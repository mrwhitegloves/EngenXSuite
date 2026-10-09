// The logo image files, in ONE place. They live in client/public/ and are replaced there
// (same file names) when the logo changes. The product NAME is not here: it comes from the
// branding settings through useBranding() (decision 0001) and is used as the images' text.
//
// "onDark" is the version drawn for a dark background, "onLight" for a light one.
// "full" is the whole word mark, "short" the small square mark for narrow places.

export const LOGOS = {
  full: {
    onDark: '/engenx-logo-dark-theme.png',
    onLight: '/engenx-logo-light-theme.png',
  },
  short: {
    // Not in public/ yet. Until it is added, the light version is shown on a white tile.
    onDark: '/short-logo-dark-theme.png',
    onLight: '/short-logo-light-theme.png',
  },
};

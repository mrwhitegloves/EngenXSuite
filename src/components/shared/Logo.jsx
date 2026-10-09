import { LOGOS } from '../../config/branding.js';

/**
 * The full logo (word mark) as an image. The product name is its text for screen readers and
 * shows if the image cannot load.
 *
 * @param {{ productName: string, background?: 'dark' | 'theme', className?: string }} props
 *        background "dark": always on a dark area (sidebar, the black half of the sign-in page).
 *        background "theme": on the page itself, so the version follows light and dark mode.
 *        className sets the size, e.g. "h-7".
 */
export default function Logo({ productName, background = 'theme', className = 'h-7' }) {
  const size = `${className} w-auto`;
  if (background === 'dark') {
    return <img src={LOGOS.full.onDark} alt={productName} className={size} />;
  }
  return (
    <>
      <img src={LOGOS.full.onLight} alt={productName} className={`${size} dark:hidden`} />
      {/* The same logo for dark mode; hidden from screen readers so the name is read once. */}
      <img
        src={LOGOS.full.onDark}
        alt=""
        aria-hidden="true"
        className={`${size} hidden dark:block`}
      />
    </>
  );
}

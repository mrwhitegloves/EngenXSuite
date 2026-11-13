import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// The preview split into the pages the PDF will have (founder, 2026-11-13: "before downloading
// we must see how many pages it becomes"). The content is laid out in CSS columns exactly as
// tall and wide as the printed body of one A4 page: the browser breaks columns with the same
// rules it uses for printing (no heading at the bottom of a page, table rows and the acceptance
// kept whole …), so column N is page N. Each page then shows its own column of that layout
// through a window of one page. A close preview, not a promise: the PDF itself is made by
// Chromium on the server and may rarely break one line differently.

const GAP_MM = 20;

/**
 * @param {{
 *   widthMm: number,        width of the printed body (A4 minus the side margins)
 *   heightMm: number,       height of the printed body (A4 minus top and bottom margins)
 *   onPageCount?: (count: number) => void,
 *   renderPage: (page: { index: number, count: number, body: import('react').ReactNode }) => import('react').ReactNode,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function PagedFlow({ widthMm, heightMm, onPageCount, renderPage, children }) {
  const flowRef = useRef(null);
  const [count, setCount] = useState(1);

  // Count the columns after every change, and again when fonts or pictures finish loading.
  useLayoutEffect(() => {
    const flow = flowRef.current;
    if (!flow) return undefined;
    const measure = () => {
      const width = flow.clientWidth;
      if (!width) return;
      const pitch = (width * (widthMm + GAP_MM)) / widthMm;
      setCount(Math.max(1, Math.round((flow.scrollWidth - width) / pitch) + 1));
    };
    measure();
    flow.addEventListener('load', measure, true);
    document.fonts?.ready.then(measure);
    return () => flow.removeEventListener('load', measure, true);
  });

  // Tell the screen when the number changes (the latest listener, without re-running for it).
  const listener = useRef(onPageCount);
  useEffect(() => {
    listener.current = onPageCount;
  });
  useEffect(() => {
    listener.current?.(count);
  }, [count]);

  const flowStyle = {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    columnWidth: `${widthMm}mm`,
    columnGap: `${GAP_MM}mm`,
    columnFill: 'auto',
  };

  return Array.from({ length: count }, (_, index) =>
    renderPage({
      index,
      count,
      body: (
        <div className="overflow-hidden" style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}>
          <div
            ref={index === 0 ? flowRef : undefined}
            aria-hidden={index === 0 ? undefined : true}
            style={{
              ...flowStyle,
              transform: `translateX(-${index * (widthMm + GAP_MM)}mm)`,
            }}
          >
            {children}
          </div>
        </div>
      ),
    }),
  );
}

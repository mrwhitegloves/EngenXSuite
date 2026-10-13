import { useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { smallButton } from '../mailFormat.js';

// A mail from outside is untrusted. It is shown with three guards:
//   1. DOMPurify removes scripts, forms, frames and every event handler.
//   2. It is drawn in a closed frame (sandbox) where no script can run and which cannot reach
//      the CRM page, its cookies or its storage.
//   3. Pictures from the internet are not loaded until the person asks: such pictures tell the
//      sender that, when and where the mail was opened.
const FORBIDDEN_TAGS = [
  'style',
  'form',
  'input',
  'button',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
];

/** The whole page of the frame. Black on white, like a mail program, in both themes. */
function pageOf(html, showPictures) {
  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ['srcset'],
    ALLOW_DATA_ATTR: false,
  });
  const pictures = showPictures ? 'https: data:' : 'data:';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${pictures}; style-src 'unsafe-inline'">
<base target="_blank">
<style>
  html, body { margin: 0; }
  body { padding: 8px; background: white; color: black; font: 14px/1.5 system-ui, sans-serif; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  blockquote { margin: 8px 0 8px 8px; padding-left: 8px; border-left: 2px solid lightgray; color: dimgray; }
</style></head><body>${clean}</body></html>`;
}

/**
 * A mail as its sender laid it out.
 * @param {{ html: string }} props
 */
export default function HtmlBody({ html }) {
  const frame = useRef(null);
  const [showPictures, setShowPictures] = useState(false);
  const [height, setHeight] = useState(120);
  const page = useMemo(() => pageOf(html, showPictures), [html, showPictures]);
  const hasPictures = /<img\b[^>]*\bsrc\s*=\s*["']?https?:/i.test(html);
  // The frame is as tall as its content (up to a limit, then it scrolls).
  const fit = () => {
    const content = frame.current?.contentDocument?.documentElement;
    if (content) setHeight(Math.min(content.scrollHeight + 4, 1200));
  };

  return (
    <div className="space-y-1">
      {hasPictures && !showPictures && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          Pictures from the internet are not loaded: they would tell the sender that you opened this
          mail.
          <button type="button" className={smallButton} onClick={() => setShowPictures(true)}>
            Show the pictures
          </button>
        </p>
      )}
      <iframe
        ref={frame}
        title="The mail as it was sent"
        // No scripts. Same-origin only so that the page can measure the height; links may
        // open in a new tab.
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={page}
        onLoad={fit}
        style={{ height }}
        className="w-full rounded-md border border-border"
      />
    </div>
  );
}

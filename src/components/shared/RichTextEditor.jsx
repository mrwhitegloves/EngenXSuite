import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
} from 'lucide-react';
import { cleanMailHtml, textToHtml } from '../../lib/richText.js';
import { looksLikeMarkdown, markdownToHtml } from '../../lib/markdownLite.js';

const toolButton =
  'inline-flex size-8 items-center justify-center rounded text-text-muted hover:bg-page hover:text-text focus-visible:outline-2 focus-visible:outline-brand';

// How the laid-out content looks inside the editor (Tailwind's reset takes list bullets and
// heading sizes away, so they are given back here).
const contentClass = [
  'min-w-0 overflow-y-auto px-3 py-2 text-sm leading-relaxed break-words outline-none',
  '[&_p]:my-2 [&_div]:my-0.5 [&_h1]:my-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:my-2',
  '[&_h2]:text-lg [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-semibold',
  '[&_h4]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal',
  '[&_ol]:pl-6 [&_li]:my-0.5 [&_a]:text-brand-text [&_a]:underline [&_blockquote]:my-2',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3',
  '[&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2',
  '[&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold',
  '[&_hr]:my-3 [&_hr]:border-border [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-page',
  '[&_pre]:p-2 [&_code]:font-mono [&_code]:text-xs',
].join(' ');

/**
 * Where words are written with their layout: a mail (Inbox, the default) or the content of a
 * document (variant "document", Document generator). Pasted content keeps its structure (bold,
 * lists, headings, links, tables), not its colours and fonts. In a document, Markdown pasted as
 * plain text (ChatGPT's "Copy" button) is laid out too, and there are tools for headings,
 * quotes, lines and undo.
 *
 * The parent reads what is written through onChange({ html, text }) and sets it through the
 * ref: ref.current.setHtml(html), ref.current.setText(text), ref.current.appendText(text).
 * `initialHtml` fills the editor once when it appears (a saved document).
 *
 * @param {{ ref?: object, label: string, placeholder?: string, rows?: number,
 *           variant?: 'mail' | 'document', initialHtml?: string, maxHeight?: string,
 *           onChange: (value: { html: string, text: string }) => void }} props
 */
export default function RichTextEditor({
  ref,
  label,
  placeholder = '',
  rows = 6,
  variant = 'mail',
  initialHtml = '',
  maxHeight = '60vh',
  onChange,
}) {
  const box = useRef(null);
  const [isEmpty, setIsEmpty] = useState(!initialHtml);
  const isDocument = variant === 'document';

  // A saved document appears with its content (once; afterwards the editor owns it).
  const filled = useRef(false);
  useLayoutEffect(() => {
    if (filled.current || !box.current) return;
    filled.current = true;
    if (initialHtml) box.current.innerHTML = cleanMailHtml(initialHtml);
  }, [initialHtml]);

  const emit = () => {
    const element = box.current;
    if (!element) return;
    const text = element.innerText
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    setIsEmpty(!text);
    onChange({ html: text ? element.innerHTML : '', text });
  };
  const set = (html) => {
    box.current.innerHTML = html;
    emit();
  };
  useImperativeHandle(ref, () => ({
    setHtml: (html) => set(cleanMailHtml(html)),
    setText: (text) => set(textToHtml(text)),
    appendText: (text) => set(`${box.current.innerHTML}${textToHtml(text)}`),
  }));

  // Formatting buttons act on the selection; pressing them must not take the cursor away.
  const command = (name, value) => (event) => {
    event.preventDefault();
    box.current.focus();
    document.execCommand(name, false, value);
    emit();
  };
  const addLink = (event) => {
    event.preventDefault();
    const address = window.prompt('Address of the link (https://…)');
    if (!address) return;
    const href = /^(https?:|mailto:|tel:)/i.test(address) ? address : `https://${address}`;
    box.current.focus();
    document.execCommand('createLink', false, href);
    emit();
  };

  const onPaste = (event) => {
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    event.preventDefault();
    let laidOut = textToHtml(text);
    if (html) laidOut = cleanMailHtml(html);
    else if (isDocument && looksLikeMarkdown(text)) laidOut = cleanMailHtml(markdownToHtml(text));
    document.execCommand('insertHTML', false, laidOut);
    emit();
  };

  // Document tools: block kinds, a quote, a line, undo and redo.
  const documentTools = [
    ['Normal text', Pilcrow, 'formatBlock', 'p'],
    ['Heading 1', Heading1, 'formatBlock', 'h1'],
    ['Heading 2', Heading2, 'formatBlock', 'h2'],
    ['Heading 3', Heading3, 'formatBlock', 'h3'],
    ['Quote', Quote, 'formatBlock', 'blockquote'],
    ['Horizontal line', Minus, 'insertHorizontalRule', undefined],
  ];

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface focus-within:border-brand">
      <div
        role="toolbar"
        aria-label={isDocument ? 'Layout of the text' : 'Layout of the mail'}
        className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-0.5"
      >
        <button
          type="button"
          className={toolButton}
          aria-label="Bold"
          onMouseDown={command('bold')}
        >
          <Bold size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={toolButton}
          aria-label="Italic"
          onMouseDown={command('italic')}
        >
          <Italic size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={toolButton}
          aria-label="Underline"
          onMouseDown={command('underline')}
        >
          <Underline size={15} aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          className={toolButton}
          aria-label="Bulleted list"
          onMouseDown={command('insertUnorderedList')}
        >
          <List size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={toolButton}
          aria-label="Numbered list"
          onMouseDown={command('insertOrderedList')}
        >
          <ListOrdered size={15} aria-hidden="true" />
        </button>
        <button type="button" className={toolButton} aria-label="Add a link" onMouseDown={addLink}>
          <Link2 size={15} aria-hidden="true" />
        </button>
        {isDocument && (
          <>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            {documentTools.map(([name, Icon, commandName, value]) => (
              <button
                key={name}
                type="button"
                className={toolButton}
                aria-label={name}
                title={name}
                onMouseDown={(event) => command(commandName, value)(event)}
              >
                <Icon size={15} aria-hidden="true" />
              </button>
            ))}
          </>
        )}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          className={toolButton}
          aria-label="Remove the layout of the chosen text"
          onMouseDown={command('removeFormat')}
        >
          <RemoveFormatting size={15} aria-hidden="true" />
        </button>
        {isDocument && (
          <>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            <button
              type="button"
              className={toolButton}
              aria-label="Undo"
              title="Undo"
              onMouseDown={command('undo')}
            >
              <Undo2 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={toolButton}
              aria-label="Redo"
              title="Redo"
              onMouseDown={command('redo')}
            >
              <Redo2 size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="relative">
        {isEmpty && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-3 text-sm text-text-muted"
          >
            {placeholder}
          </span>
        )}
        <div
          ref={box}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onPaste={onPaste}
          className={contentClass}
          style={{ minHeight: `${rows * 1.6}rem`, maxHeight }}
        />
      </div>
    </div>
  );
}

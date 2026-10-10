// Showing and choosing tags. A tag's colour is the name of a design token, never a colour value.

const COLOR_CLASSES = {
  brand: 'border-brand text-brand-text',
  success: 'border-success text-success',
  warning: 'border-warning text-warning',
  danger: 'border-danger text-danger',
  info: 'border-info text-info',
};
const PLAIN_CLASS = 'border-border text-text-muted';

export const TAG_COLOR_LABELS = {
  brand: 'Red',
  success: 'Green',
  warning: 'Amber',
  danger: 'Dark red',
  info: 'Blue',
};

const chipClass = (color) =>
  `inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${COLOR_CLASSES[color] ?? PLAIN_CLASS}`;

/** One tag as a small label. */
export function TagChip({ tag }) {
  return <span className={chipClass(tag.color)}>{tag.name}</span>;
}

/** The tags of a record in a row; nothing at all when it has none. */
export function TagChips({ tags, className = '' }) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul aria-label="Tags" className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => (
        <li key={tag.id}>
          <TagChip tag={tag} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Choose tags for a record: every offered tag is a button that is switched on or off.
 * @param {{ tags: { id: string, name: string, color: string | null }[], value: string[],
 *           onChange: (ids: string[]) => void, label?: string }} props
 */
export function TagPicker({ tags, value, onChange, label = 'Tags' }) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No tags yet. An administrator adds them in Settings → Tags.
      </p>
    );
  }
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isOn = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={isOn}
            onClick={() => toggle(tag.id)}
            className={[
              'rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-brand',
              isOn
                ? 'border-brand bg-brand-soft font-medium text-brand-text'
                : 'border-border bg-surface text-text-muted hover:border-text-muted',
            ].join(' ')}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}

// Shown when a view has nothing to display. Always says what the place is for and,
// when there is one, offers the single most useful next action.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      {Icon && <Icon size={28} className="mb-3 text-text-muted" aria-hidden="true" />}
      <h2 className="text-base font-medium">{title}</h2>
      {description && <p className="mt-1 max-w-md text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

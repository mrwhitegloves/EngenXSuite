// Live "something changed" events from the server, and which cached answers each one makes stale.
// An event carries no data: the screen simply asks the API again (the API checks permissions).
// The event names must match server/constants/socketEvents.js (the projects share no code).
// To react to a new event, add one line here.

export const REALTIME_REFETCH = {
  // My own account changed: name, picture, account type.
  'me.changed': [['auth']],
  // The list of users changed.
  'users.changed': [['users']],
  // An account type or its permissions changed: my menu and rights may differ now.
  'permissions.changed': [['auth'], ['roles'], ['users']],
  // An account (customer company) was added, changed or deleted.
  'accounts.changed': [['accounts']],
  // A contact (a person at a customer company) was added, changed or deleted.
  'contacts.changed': [['contacts']],
  // A plant or one of its machines was added, changed or deleted.
  'plants.changed': [['plants']],
  // A lead was added, changed, moved to another stage, reassigned or deleted.
  'opportunities.changed': [['opportunities'], ['dashboard'], ['search']],
  // Something was added to a timeline, or a note was changed or removed.
  'activities.changed': [['timeline']],
  // My notifications changed: a new one, or some were read.
  'notifications.changed': [['notifications']],
  // A task was added, changed, completed or deleted.
  'tasks.changed': [['tasks'], ['dashboard'], ['search']],
  // A call started, moved on or ended, its outcome was set, or the call settings changed.
  'calls.changed': [['calls']],
  // An inbound lead arrived or was processed, or a lead form or the assignment rule changed.
  'inbound-leads.changed': [['inbound-leads']],
  // A tag was added, renamed, merged or deleted: reload the tags and the records that show them.
  'tags.changed': [['tags'], ['accounts'], ['contacts'], ['opportunities']],
  // An import of mine moved on (progress, finished, undone).
  'imports.changed': [['imports']],
  // A list in Settings changed (statuses, stages, categories): reload the lists and the records
  // that show their names.
  'status-lists.changed': [['status-lists'], ['accounts'], ['opportunities']],
  // The product name or company name changed.
  'branding.changed': [['branding']],
};

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
};

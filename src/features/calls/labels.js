// The words and small helpers every calls screen uses (the Calls block of a record, the call
// log and the page of one call).

export const STATUS_LABELS = {
  initiated: 'Starting',
  ringing: 'Ringing',
  in_progress: 'Talking now',
  completed: 'Talked',
  missed: 'Missed',
  busy: 'Busy',
  no_answer: 'No answer',
  failed: 'Did not go through',
};
export const OUTCOME_LABELS = {
  connected: 'Talked to them',
  no_answer: 'No answer',
  callback_requested: 'Asked to call back',
  not_interested: 'Not interested',
  wrong_number: 'Wrong number',
};
export const DIRECTION_LABELS = { outbound: 'Outgoing', inbound: 'Incoming' };
// Calls in which nobody talked.
export const DID_NOT_HAPPEN = ['missed', 'busy', 'no_answer', 'failed'];

export const formatMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
/** With seconds: for the page of one call. */
export const formatExactMoment = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
export const formatLength = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export const formatRupees = (amount) => `₹${Number(amount ?? 0).toFixed(2)}`;

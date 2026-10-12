// Where the AI assistant's conversations live: in THIS browser only (localStorage), never on
// the server. Founder decisions (2026-10-12): removed at sign-out, and a conversation that was
// not touched for 7 days is removed by itself.
//
// One entry per user: "ai-assistant:<userId>" → { chats: [...], activeId }.
// A chat: { id, title, updatedAt, instruction, records: [{ type, id, title }],
//           messages: [{ id, role, content, attachments?: [{ name, kind, text }], at }] }

const PREFIX = 'ai-assistant:';
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHATS = 30;

const keyOf = (userId) => `${PREFIX}${userId}`;
const empty = () => ({ chats: [], activeId: null });

/** The saved conversations of one user, without the ones that are too old. */
export function loadAssistant(userId, now = Date.now()) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyOf(userId)) ?? 'null');
    if (!saved || !Array.isArray(saved.chats)) return empty();
    const chats = saved.chats.filter((chat) => now - (chat.updatedAt ?? 0) < KEEP_MS);
    const activeId = chats.some((chat) => chat.id === saved.activeId) ? saved.activeId : null;
    return { chats, activeId };
  } catch {
    // Unreadable (damaged, or storage switched off): start empty.
    return empty();
  }
}

/**
 * Save them. When the browser's storage is full, the oldest conversations are dropped until
 * it fits; when storage is not available at all, the conversations simply last until reload.
 */
export function saveAssistant(userId, state) {
  let chats = [...state.chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
  while (chats.length >= 0) {
    try {
      localStorage.setItem(keyOf(userId), JSON.stringify({ ...state, chats }));
      return;
    } catch {
      if (chats.length === 0) return;
      chats = chats.slice(0, -1);
    }
  }
}

/** Remove every saved conversation from this browser (sign-out, or another person signs in). */
export function clearAssistant() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to remove when storage is not available.
  }
}

/** Remove the conversations of everyone except this user (a shared computer). */
export function clearOtherAssistants(userId) {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX) && key !== keyOf(userId))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to remove when storage is not available.
  }
}

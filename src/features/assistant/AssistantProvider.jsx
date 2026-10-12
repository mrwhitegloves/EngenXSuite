import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { apiRequest } from '../../lib/apiClient.js';
import { clearOtherAssistants, loadAssistant, saveAssistant } from '../../lib/assistantStore.js';
import { AssistantContext } from './assistantContext.js';

// The AI assistant's state for the whole app: the conversations (kept in this browser only),
// which one is open, and the actions. Any screen can open the assistant about its record with
// useAssistant().ask({ record, question }) (the hook is in assistantContext.js).

// What is sent along with a question: the newest messages, within a size the server accepts.
const SEND_MESSAGES = 20;
const SEND_CHARACTERS = 400_000;
const MAX_RECORDS = 5;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const blankChat = () => ({
  id: newId(),
  title: 'New chat',
  updatedAt: Date.now(),
  instruction: '',
  records: [],
  messages: [],
});
const titleFrom = (text) => (text.length > 40 ? `${text.slice(0, 40)}…` : text) || 'New chat';

/** The messages to send: the newest ones that fit, starting with one of the person's. */
function forServer(messages) {
  const kept = [];
  let size = 0;
  for (const message of [...messages].reverse().slice(0, SEND_MESSAGES)) {
    const length =
      message.content.length +
      (message.attachments ?? []).reduce((sum, file) => sum + file.text.length, 0);
    if (kept.length > 0 && size + length > SEND_CHARACTERS) break;
    size += length;
    kept.unshift(message);
  }
  while (kept.length > 1 && kept[0].role !== 'user') kept.shift();
  return kept.map(({ role, content, attachments }) => ({
    role,
    content,
    ...(attachments?.length
      ? { attachments: attachments.map(({ name, text }) => ({ name, text })) }
      : {}),
  }));
}

export default function AssistantProvider({ children }) {
  const { user } = useAuth();
  const userId = user.id;
  const [state, setState] = useState(() => loadAssistant(userId));
  const [isOpen, setIsOpen] = useState(false);
  const [busyChatId, setBusyChatId] = useState(null);
  const [error, setError] = useState(null);
  // The newest state, for actions that run after an await.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  // Another person's conversations must not stay in this browser.
  useEffect(() => clearOtherAssistants(userId), [userId]);
  useEffect(() => saveAssistant(userId, state), [userId, state]);

  const update = useCallback((chatId, change) => {
    setState((current) => ({
      ...current,
      chats: current.chats.map((chat) =>
        chat.id === chatId ? { ...change(chat), updatedAt: Date.now() } : chat,
      ),
    }));
  }, []);

  const startChat = useCallback((records = []) => {
    const chat = { ...blankChat(), records };
    setState((current) => ({ chats: [chat, ...current.chats], activeId: chat.id }));
    return chat;
  }, []);

  /** Send what the person wrote (and the files they added) in one chat, and add the answer. */
  const send = useCallback(
    async (chatId, content, attachments = [], newChat = null) => {
      // `newChat`: a chat made in this same moment, which is not in the saved state yet.
      const chat = newChat ?? latest.current.chats.find((item) => item.id === chatId);
      if (!chat) return;
      const mine = { id: newId(), role: 'user', content, attachments, at: Date.now() };
      const messages = [...chat.messages, mine];
      update(chatId, (item) => ({
        ...item,
        messages,
        title: item.messages.length === 0 ? titleFrom(content || attachments[0]?.name) : item.title,
      }));
      setError(null);
      setBusyChatId(chatId);
      try {
        const { data } = await apiRequest('/ai/chat', {
          method: 'POST',
          body: {
            messages: forServer(messages),
            ...(chat.instruction.trim() ? { instruction: chat.instruction.trim() } : {}),
            context: chat.records.map(({ type, id }) => ({ type, id })),
          },
        });
        update(chatId, (item) => ({
          ...item,
          // The server's titles are the current names of the records.
          records: data.records,
          messages: [
            ...item.messages,
            { id: newId(), role: 'assistant', content: data.reply, at: Date.now() },
          ],
        }));
      } catch (problem) {
        setError({ chatId, message: problem.message });
      } finally {
        setBusyChatId(null);
      }
    },
    [update],
  );

  const value = useMemo(() => {
    const active = state.chats.find((chat) => chat.id === state.activeId) ?? null;
    return {
      isOpen,
      chats: state.chats,
      active,
      isBusy: Boolean(active) && busyChatId === active.id,
      error: error && active && error.chatId === active.id ? error.message : null,
      maxRecords: MAX_RECORDS,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      newChat: () => {
        setError(null);
        startChat();
      },
      selectChat: (id) => setState((current) => ({ ...current, activeId: id })),
      deleteChat: (id) =>
        setState((current) => {
          const chats = current.chats.filter((chat) => chat.id !== id);
          return {
            chats,
            activeId: current.activeId === id ? (chats[0]?.id ?? null) : current.activeId,
          };
        }),
      setInstruction: (text) =>
        active && update(active.id, (chat) => ({ ...chat, instruction: text })),
      addRecord: (record) =>
        active &&
        update(active.id, (chat) =>
          chat.records.some((item) => item.type === record.type && item.id === record.id) ||
          chat.records.length >= MAX_RECORDS
            ? chat
            : { ...chat, records: [...chat.records, record] },
        ),
      removeRecord: (record) =>
        active &&
        update(active.id, (chat) => ({
          ...chat,
          records: chat.records.filter(
            (item) => !(item.type === record.type && item.id === record.id),
          ),
        })),
      send: (content, attachments) => active && send(active.id, content, attachments),
      /**
       * Open the assistant in a new chat about one record, and ask a first question when
       * one is given. For "Ask AI" buttons on a lead, a company, a person or a call.
       * @param {{ record: { type: string, id: string, title: string }, question?: string }} about
       */
      ask: ({ record, question }) => {
        setError(null);
        setIsOpen(true);
        const chat = startChat([record]);
        if (question) send(chat.id, question, [], chat);
      },
    };
  }, [state, isOpen, busyChatId, error, startChat, update, send]);

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

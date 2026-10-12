import { createContext, useContext } from 'react';

// The AI assistant's state, shared with every screen (the provider is AssistantProvider.jsx).
export const AssistantContext = createContext(null);

/** The assistant: its conversations and actions. See AssistantProvider for what it holds. */
export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error('useAssistant needs the AssistantProvider');
  return value;
}

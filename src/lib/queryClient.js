import { QueryClient } from '@tanstack/react-query';

// One query client for the whole app. Server data lives here, not in component state.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is treated as fresh for a short time, so moving between screens does not refetch
      // everything. Live updates will invalidate the affected queries when something changes.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying "not signed in", "no permission" or "not found" only delays the message.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error?.status >= 400 && error?.status < 500),
    },
  },
});

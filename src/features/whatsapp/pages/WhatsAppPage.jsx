import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, compactInputClass } from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import { useListParams } from '../../../hooks/useListParams.js';
import { useTags } from '../../../hooks/useTags.js';
import { useLeadOptions } from '../../pipeline/api.js';
import { useConversation, useConversations, useWhatsAppSetup } from '../api.js';
import ChatPanel from '../components/ChatPanel.jsx';
import ConversationList from '../components/ConversationList.jsx';
import DetailsPanel from '../components/DetailsPanel.jsx';
import { LIST_VIEWS } from '../waFormat.jsx';

const DETAILS_KEY = 'whatsapp.detailsOpen';
const WIDE_QUERY = '(min-width: 1280px)';

// Whether the screen is wide enough for the details beside the chat; follows a resize.
function useIsWide() {
  const [isWide, setIsWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const follow = () => setIsWide(query.matches);
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);
  return isWide;
}
const PAGE_SIZE = 30;

function readDetailsOpen() {
  try {
    return window.localStorage.getItem(DETAILS_KEY) !== 'false';
  } catch {
    return true;
  }
}

// The details of the open chat: beside it on a wide screen, over it on a smaller one.
function OpenDetails({ conversationId, onClose }) {
  const chat = useConversation(conversationId);
  if (!chat.data) return null;
  return <DetailsPanel chat={chat.data} onClose={onClose} />;
}

/**
 * WhatsApp with customers, like WhatsApp Web: the chats on the left, the open chat in the middle
 * and its details on the right. Filters and search are kept in the address.
 */
export default function WhatsAppPage() {
  const can = useCan();
  const navigate = useNavigate();
  const { conversationId: openId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const list = useListParams(['view', 'search', 'assignedTo', 'stageId', 'tagId']);
  const [isDetailsOpen, setIsDetailsOpen] = useState(readDetailsOpen);
  // Below 1280 px the details cover the chat, so they open only when asked for.
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isWide = useIsWide();
  const setup = useWhatsAppSetup();
  const options = useLeadOptions();
  const tags = useTags();
  const view = LIST_VIEWS.find((item) => item.id === list.values.view) ?? LIST_VIEWS[0];
  const conversations = useConversations({
    view: view.id,
    search: list.values.search,
    assignedTo: list.values.assignedTo,
    stageId: list.values.stageId,
    tagId: list.values.tagId,
    page: list.page,
    pageSize: PAGE_SIZE,
  });
  const rows = conversations.data?.data ?? [];
  const counts = conversations.data?.meta?.counts ?? {};
  const users = options.data?.canAssign ? options.data.users : [];
  const stages = options.data?.stages ?? [];
  const query = searchParams.toString();
  const open = (id) => {
    setIsSheetOpen(false);
    navigate(`/whatsapp${id ? `/${id}` : ''}${query ? `?${query}` : ''}`);
  };
  const toggleDetails = () => {
    if (!isWide) {
      setIsSheetOpen((current) => !current);
      return;
    }
    setIsDetailsOpen((current) => {
      try {
        window.localStorage.setItem(DETAILS_KEY, String(!current));
      } catch {
        // The choice is only a convenience; without storage it is not remembered.
      }
      return !current;
    });
  };

  const nameOf = (items, id) => items.find((item) => item.id === id)?.name ?? '…';
  const chips = [
    list.values.assignedTo && {
      key: 'assignedTo',
      label: `Answered by: ${list.values.assignedTo === 'unassigned' ? 'nobody yet' : nameOf(users, list.values.assignedTo)}`,
      onRemove: () => list.setFilters({ assignedTo: '' }),
    },
    list.values.stageId && {
      key: 'stageId',
      label: `Stage: ${nameOf(stages, list.values.stageId)}`,
      onRemove: () => list.setFilters({ stageId: '' }),
    },
    list.values.tagId && {
      key: 'tagId',
      label: `Tag: ${nameOf(tags.data ?? [], list.values.tagId)}`,
      onRemove: () => list.setFilters({ tagId: '' }),
    },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Chats with customers on the company's WhatsApp number."
      />
      {setup.data && !setup.data.isConfigured && (
        <p className="mb-4 rounded-md border border-warning bg-surface p-3 text-sm">
          WhatsApp is not set up yet ({setup.data.missing.join(', ')} missing), so messages cannot
          be sent or received. See Settings → WhatsApp.
        </p>
      )}

      <div className="grid h-[calc(100dvh-15rem)] grid-cols-[minmax(0,1fr)] min-h-[30rem] overflow-hidden rounded-lg border border-border bg-surface lg:h-[calc(100dvh-12rem)] lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)_auto]">
        <section
          aria-label="Chats"
          className={`flex min-h-0 min-w-0 flex-col border-border lg:border-r ${openId ? 'max-lg:hidden' : ''}`}
        >
          <div className="space-y-2 border-b border-border p-2">
            <div role="tablist" aria-label="Show" className="flex gap-1 overflow-x-auto pb-1">
              {LIST_VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === view.id}
                  onClick={() => list.setFilters({ view: item.id === 'all' ? '' : item.id })}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand ${
                    item.id === view.id
                      ? 'border-success bg-success text-surface'
                      : 'border-border hover:border-text-muted'
                  }`}
                >
                  {item.label}
                  {counts[item.id] !== undefined && (
                    <span className="ml-1 font-semibold">{counts[item.id]}</span>
                  )}
                </button>
              ))}
            </div>
            <FilterBar
              search={{
                value: list.values.search,
                onChange: (text) => list.setFilters({ search: text }),
                placeholder: 'Name, phone, company or EGL code',
                label: 'Search chats',
              }}
              chips={chips}
              onClearAll={list.clearFilters}
            >
              {users.length > 0 && (
                <select
                  aria-label="Answered by"
                  value={list.values.assignedTo}
                  onChange={(event) => list.setFilters({ assignedTo: event.target.value })}
                  className={compactInputClass}
                >
                  <option value="">Anyone</option>
                  <option value="unassigned">Nobody yet</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                aria-label="Stage of the lead"
                value={list.values.stageId}
                onChange={(event) => list.setFilters({ stageId: event.target.value })}
                className={compactInputClass}
              >
                <option value="">Any stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tag"
                value={list.values.tagId}
                onChange={(event) => list.setFilters({ tagId: event.target.value })}
                className={compactInputClass}
              >
                <option value="">Any tag</option>
                {(tags.data ?? []).map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </FilterBar>
          </div>
          <FormError message={conversations.error?.message} />
          {conversations.isPending && (
            <p role="status" className="p-3 text-text-muted">
              Loading…
            </p>
          )}
          {conversations.isSuccess && rows.length === 0 && (
            <div className="p-3">
              <EmptyState
                icon={MessageCircle}
                title={list.hasFilters ? 'No chats match these filters' : 'No chats yet'}
                description="A chat starts when a customer writes to the company's WhatsApp number, or when you press WhatsApp beside a person in Accounts → People."
              />
            </div>
          )}
          <ConversationList
            rows={rows}
            openId={openId}
            onOpen={open}
            showOwner={users.length > 0}
          />
          <div className="border-t border-border px-2 empty:hidden">
            <Pagination
              meta={conversations.data?.meta}
              noun={['chat', 'chats']}
              onPageChange={list.setPage}
            />
          </div>
        </section>

        <div className={`min-h-0 min-w-0 ${openId ? '' : 'max-lg:hidden'}`}>
          {openId ? (
            <ChatPanel
              key={openId}
              conversationId={openId}
              onBack={() => open('')}
              isDetailsOpen={isWide ? isDetailsOpen : isSheetOpen}
              onToggleDetails={toggleDetails}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-page p-6 text-center text-text-muted">
              <MessageCircle size={40} aria-hidden="true" />
              <p className="font-medium text-text">Select a chat</p>
              <p className="max-w-sm text-sm">
                Or open a company in{' '}
                <Link to="/accounts" className="text-brand-text hover:underline">
                  Accounts
                </Link>{' '}
                and press WhatsApp beside a person to start one.
              </p>
            </div>
          )}
        </div>

        {/* Wide screens: a third column. */}
        {openId && isDetailsOpen && (
          <div className="hidden w-80 min-h-0 border-l border-border xl:block">
            <OpenDetails conversationId={openId} onClose={toggleDetails} />
          </div>
        )}
        {/* Smaller screens: a sheet over the chat. */}
        {openId && isSheetOpen && (
          <>
            <div className="fixed inset-0 z-40 flex justify-end bg-black/40 xl:hidden">
              <button
                type="button"
                aria-label="Hide the details"
                className="flex-1 cursor-default"
                onClick={toggleDetails}
              />
              <div className="h-full w-full max-w-sm shadow-xl">
                <OpenDetails conversationId={openId} onClose={toggleDetails} />
              </div>
            </div>
          </>
        )}
      </div>
      {!can('whatsapp', 'create') && (
        <p className="mt-2 text-xs text-text-muted">You can read chats but not write in them.</p>
      )}
    </>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Clock,
  Eye,
  Globe,
  Inbox,
  Laptop,
  Mail,
  Phone,
  RefreshCw,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import DateRangeFilter, {
  dateRangeParams,
  dateRangeProblem,
} from '../../../components/shared/DateRangeFilter.jsx';
import FilterBar from '../../../components/shared/FilterBar.jsx';
import Pagination from '../../../components/shared/Pagination.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useListParams } from '../../../hooks/useListParams.js';
import { formatDateTime } from '../../../lib/dates.js';
import {
  useWebsiteLeads,
  useWebsiteOverview,
  useWebsiteSessions,
  useWebsiteStatus,
} from '../api.js';
import {
  BarList,
  DonutChart,
  SLICE_BG,
  TrafficChart,
  TrafficLegend,
} from '../components/charts.jsx';
import { TABS, countryBadge, formatNumber, formatStay, sourceName, stayTone } from '../format.js';

const DEVICE_ICONS = { Desktop: Laptop, Mobile: Smartphone, Tablet };

function Tile({ label, value, hint, icon: Icon }) {
  return (
    <section className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      <span className="rounded-md bg-brand-soft p-2 text-brand-text">
        <Icon size={18} aria-hidden="true" />
      </span>
    </section>
  );
}

function Card({ title, description, children, className = '', action }) {
  return (
    <section className={`rounded-lg border border-border bg-surface p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-xs text-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const nothing = (text) => <p className="py-8 text-center text-sm text-text-muted">{text}</p>;

// ── Overview ───────────────────────────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  const { traffic, topPages, devices, summary } = data;
  return (
    <div className="space-y-4">
      <Card
        title="Daily visitors"
        description={`Pageviews and unique visitors ${traffic.unit === 'month' ? 'per month' : 'per day'}${data.range ? '' : ' (last 30 days)'}`}
        action={<TrafficLegend />}
      >
        {traffic.points.some((point) => point.views > 0) ? (
          <TrafficChart points={traffic.points} unit={traffic.unit} />
        ) : (
          nothing('No visits in these dates.')
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Most visited pages" description="Where visitors spend their visits">
          {topPages.length ? (
            <BarList
              rows={topPages.slice(0, 8).map((page) => ({ label: page.path, value: page.views }))}
            />
          ) : (
            nothing('No pages visited yet.')
          )}
        </Card>
        <Card title="Device breakdown" description="Desktop, phone and tablet">
          {devices.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <DonutChart
                label="Pageviews by device"
                slices={devices.map((row) => ({ label: row.device, value: row.views }))}
              />
              <ul className="w-full space-y-2 text-sm">
                {devices.map((row, index) => {
                  const Icon = DEVICE_ICONS[row.device] ?? Laptop;
                  return (
                    <li
                      key={row.device}
                      className="flex items-center justify-between gap-2 border-b border-border pb-1.5"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${SLICE_BG[index % SLICE_BG.length]}`}
                          aria-hidden="true"
                        />
                        <Icon size={14} aria-hidden="true" className="text-text-muted" />
                        {row.device}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">
                          {formatNumber(row.views)} views
                        </span>
                        <span className="font-semibold">{row.share}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            nothing('No devices recorded yet.')
          )}
          <p className="mt-3 text-xs text-text-muted">
            {formatNumber(summary.pagesPerVisitor)} pages per visitor on average.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ── Pages & Sources ────────────────────────────────────────────────────────────────────────

function PagesTab({ data }) {
  const columns = [
    {
      key: 'path',
      header: 'Page',
      render: (row) => <span className="font-mono text-xs">{row.path}</span>,
    },
    { key: 'views', header: 'Pageviews', render: (row) => formatNumber(row.views) },
    {
      key: 'share',
      header: 'Share',
      render: (row) => <span className="font-semibold">{row.share}%</span>,
    },
    { key: 'stay', header: 'Avg stay', render: (row) => formatStay(row.avgStaySeconds) },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card title="Traffic by page" description="The 50 most visited pages in these dates">
          {data.topPages.length ? (
            <DataTable
              caption="Traffic by page"
              columns={columns}
              rows={data.topPages}
              rowKey={(row) => row.path}
            />
          ) : (
            nothing('No pages visited yet.')
          )}
        </Card>
      </div>
      <div className="lg:col-span-4">
        <Card title="Where visitors came from" description="The page or site that sent them">
          {data.referrers.length ? (
            <ul className="space-y-3">
              {data.referrers.map((row) => (
                <li key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" title={row.name}>
                      {sourceName(row.name)}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatNumber(row.views)} · {row.share}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-page">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${row.share}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            nothing('No sources recorded yet.')
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Visitor sessions ───────────────────────────────────────────────────────────────────────

function SessionsTab({ data, list, dates }) {
  const sessions = useWebsiteSessions({ ...dates, search: list.values.search, page: list.page });
  const rows = sessions.data?.data ?? [];
  const columns = [
    {
      key: 'visitor',
      header: 'Visitor and place',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span
            className="inline-flex min-w-9 shrink-0 justify-center rounded border border-border bg-page px-1.5 py-0.5 text-xs font-semibold"
            title={row.location?.country ?? undefined}
          >
            {countryBadge(row.location?.countryCode)}
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-xs font-semibold">
              {row.ipAddress ?? 'Unknown address'}
            </span>
            <span className="block text-xs text-text-muted">
              {row.location
                ? [row.location.city, row.location.region, row.location.country]
                    .filter(Boolean)
                    .join(', ')
                : 'Place not known'}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      render: (row) => {
        const Icon = DEVICE_ICONS[row.device] ?? Laptop;
        return (
          <span className="flex items-center gap-1.5 text-xs">
            <Icon size={14} aria-hidden="true" className="text-text-muted" />
            {row.browser}
          </span>
        );
      },
    },
    {
      key: 'pages',
      header: 'Pages opened',
      render: (row) => (
        <span className="rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand-text">
          {row.pagesCount} {row.pagesCount === 1 ? 'page' : 'pages'}
        </span>
      ),
    },
    {
      key: 'paths',
      header: 'Pages visited',
      render: (row) => (
        <span className="flex max-w-xs flex-wrap gap-1">
          {row.paths.map((path) => (
            <span
              key={path}
              className="truncate rounded border border-border bg-page px-1.5 font-mono text-[11px]"
              title={path}
            >
              {path}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: 'stay',
      header: 'Stay time',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold ${stayTone(row.totalDurationSeconds)}`}
        >
          <Clock size={11} aria-hidden="true" />
          {formatStay(row.totalDurationSeconds)}
        </span>
      ),
    },
    {
      key: 'last',
      header: 'Last seen',
      render: (row) => (
        <span className="text-xs whitespace-nowrap text-text-muted">
          {formatDateTime(row.lastActive)}
        </span>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          label="Avg page stay"
          value={formatStay(data.summary.avgStaySeconds)}
          hint="Time on one page"
          icon={Clock}
        />
        <Tile
          label="Most engaging page"
          value={<span className="font-mono text-base">{data.mostEngagedPath?.path ?? '—'}</span>}
          hint={
            data.mostEngagedPath
              ? `${formatStay(data.mostEngagedPath.avgStaySeconds)} on average`
              : 'Longest average stay'
          }
          icon={Activity}
        />
        <Tile
          label="Countries"
          value={formatNumber(data.summary.countries)}
          hint="Countries visitors came from"
          icon={Globe}
        />
      </div>
      <FilterBar
        search={{
          value: list.values.search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Address, city, country or page',
          label: 'Search visitors',
        }}
      />
      <FormError message={sessions.error?.message} />
      {sessions.isPending && <p className="text-text-muted">Loading…</p>}
      {sessions.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title="No visitors in these dates"
          description="Visits show here as people browse engenx.in."
        />
      )}
      {rows.length > 0 && (
        <DataTable
          caption="Visitor sessions"
          columns={columns}
          rows={rows}
          isRefreshing={sessions.isFetching && !sessions.isPending}
        />
      )}
      <Pagination
        meta={sessions.data?.meta}
        noun={['visitor', 'visitors']}
        onPageChange={list.setPage}
      />
    </div>
  );
}

// ── Contact leads ──────────────────────────────────────────────────────────────────────────

function LeadsTab({ list, dates }) {
  const leads = useWebsiteLeads({ ...dates, search: list.values.search, page: list.page });
  const rows = leads.data?.data ?? [];
  const columns = [
    {
      key: 'when',
      header: 'Submitted',
      render: (row) => (
        <span className="text-xs whitespace-nowrap text-text-muted">
          {formatDateTime(row.submittedAt)}
        </span>
      ),
    },
    {
      key: 'who',
      header: 'Contact',
      render: (row) => (
        <span className="block min-w-0">
          <span className="block font-semibold">{row.name || '—'}</span>
          {row.email && (
            <a
              href={`mailto:${row.email}`}
              className="flex items-center gap-1 text-xs break-all text-brand-text hover:underline"
            >
              <Mail size={11} aria-hidden="true" />
              {row.email}
            </a>
          )}
        </span>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (row) => row.company ?? <span className="text-text-muted italic">Not given</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) =>
        row.phone ? (
          <a
            href={`tel:${row.phone}`}
            className="flex items-center gap-1 font-mono text-xs whitespace-nowrap text-brand-text hover:underline"
          >
            <Phone size={11} aria-hidden="true" />
            {row.phone}
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <p className="max-w-md text-sm break-words whitespace-pre-wrap">{row.message || '—'}</p>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <FilterBar
        search={{
          value: list.values.search,
          onChange: (text) => list.setFilters({ search: text }),
          placeholder: 'Name, email, company, phone or message',
          label: 'Search leads',
        }}
      />
      <FormError message={leads.error?.message} />
      {leads.isPending && <p className="text-text-muted">Loading…</p>}
      {leads.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No contact-form leads in these dates"
          description="Leads show here when someone sends the contact form on engenx.in."
        />
      )}
      {rows.length > 0 && (
        <DataTable
          caption="Contact leads"
          columns={columns}
          rows={rows}
          isRefreshing={leads.isFetching && !leads.isPending}
        />
      )}
      <Pagination meta={leads.data?.meta} noun={['lead', 'leads']} onPageChange={list.setPage} />
      <p className="text-xs text-text-muted">
        These are the website&apos;s own records; the CRM reads them and changes nothing on the
        website.
      </p>
    </div>
  );
}

/**
 * The Website screen: visitors and contact-form leads of engenx.in (founder, 2026-10-26),
 * read from the website's own database. One date filter for every tab; state in the address.
 */
export default function WebsitePage() {
  const queryClient = useQueryClient();
  const list = useListParams(['tab', 'range', 'from', 'to', 'search']);
  const tab = TABS.find((item) => item.id === list.values.tab) ?? TABS[0];
  const status = useWebsiteStatus();
  const isConnected = status.data?.isConfigured;
  const dates = dateRangeParams(list.values);
  const datesProblem = dateRangeProblem(list.values);
  const overview = useWebsiteOverview(dates, { enabled: Boolean(isConnected) && !datesProblem });
  const data = overview.data;

  return (
    <>
      <PageHeader title="Website" description="Visitors and contact-form leads of engenx.in.">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={overview.isFetching}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['website'] })}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={overview.isFetching ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </PageHeader>

      {status.isSuccess && !isConnected && (
        <p className="mb-4 rounded-md border border-warning bg-surface p-3 text-sm">
          The website&apos;s database is not connected yet, so there is nothing to show. Someone who
          manages the server adds the setting WEBSITE_MONGODB_URI.
        </p>
      )}

      {isConnected && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div
              role="tablist"
              aria-label="Website views"
              className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === tab.id}
                  onClick={() =>
                    list.setFilters({ tab: item.id === 'overview' ? '' : item.id, search: '' })
                  }
                  className={`rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
                    item.id === tab.id
                      ? 'bg-page font-semibold shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <DateRangeFilter label="Visit date" value={list.values} onChange={list.setFilters} />
          </div>

          <FormError message={overview.error?.message} />
          {overview.isPending && !datesProblem && <p className="text-text-muted">Loading…</p>}

          {data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Tile
                  label="Unique visitors"
                  value={formatNumber(data.summary.visitors)}
                  hint="Different visitors"
                  icon={Users}
                />
                <Tile
                  label="Pageviews"
                  value={formatNumber(data.summary.pageviews)}
                  hint={`${formatNumber(data.summary.pagesPerVisitor)} per visitor`}
                  icon={Eye}
                />
                <Tile
                  label="Avg page stay"
                  value={formatStay(data.summary.avgStaySeconds)}
                  hint="Time on one page"
                  icon={Clock}
                />
                <Tile
                  label="Contact leads"
                  value={formatNumber(data.summary.leads)}
                  hint="Contact-form enquiries"
                  icon={Inbox}
                />
              </div>
              {tab.id === 'overview' && <OverviewTab data={data} />}
              {tab.id === 'pages' && <PagesTab data={data} />}
              {tab.id === 'sessions' && <SessionsTab data={data} list={list} dates={dates} />}
              {tab.id === 'leads' && <LeadsTab list={list} dates={dates} />}
            </>
          )}
        </div>
      )}
    </>
  );
}

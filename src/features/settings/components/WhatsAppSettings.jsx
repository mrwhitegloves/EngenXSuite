import { ExternalLink, RefreshCw } from 'lucide-react';
import { FormError, secondaryButtonClass } from '../../../components/shared/form.jsx';
import { useRefreshTemplates, useTemplates, useWhatsAppStatus } from '../../whatsapp/api.js';

const QUALITY_WORDS = {
  GREEN: ['High', 'text-success'],
  YELLOW: ['Medium: fewer complaints needed', 'text-warning'],
  RED: ['Low: Meta may limit the number', 'text-danger'],
};
const STATUS_TONE = { APPROVED: 'text-success', REJECTED: 'text-danger', PAUSED: 'text-warning' };

/**
 * Settings → WhatsApp: whether WhatsApp is set up, the business number as Meta shows it, and
 * the templates with their status. Templates are made and edited in Meta's WhatsApp Manager;
 * the CRM only reads them.
 */
export default function WhatsAppSettings() {
  const status = useWhatsAppStatus();
  const templates = useTemplates({ all: true, enabled: Boolean(status.data?.isConfigured) });
  const refresh = useRefreshTemplates();
  const data = status.data;
  const quality = data?.number?.qualityRating ? QUALITY_WORDS[data.number.qualityRating] : null;

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-lg border border-border bg-surface p-4">
        <h2 className="font-semibold">Connection</h2>
        {status.isPending && <p className="text-text-muted">Loading…</p>}
        <FormError message={status.error?.message} />
        {data && (
          <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt className="text-text-muted">Set up</dt>
            <dd className={data.isConfigured ? 'text-success' : 'text-danger'}>
              {data.isConfigured
                ? 'Yes'
                : `No: ${data.missing.join(', ')} missing in the server settings`}
            </dd>
            <dt className="text-text-muted">Business number</dt>
            <dd>
              {data.number
                ? `${data.number.displayNumber ?? '—'} (${data.number.verifiedName ?? 'no name'})`
                : (data.numberError ?? '—')}
            </dd>
            <dt className="text-text-muted">Quality rating</dt>
            <dd className={quality?.[1] ?? ''}>{quality?.[0] ?? '—'}</dd>
            <dt className="text-text-muted">Webhook address</dt>
            <dd className="break-all">
              https://crm-api.engenx.in{data.webhookPath} (field “messages”)
            </dd>
            <dt className="text-text-muted">Templates</dt>
            <dd>
              {data.hasBusinessAccount
                ? 'Read from Meta'
                : 'WHATSAPP_BUSINESS_ACCOUNT_ID is missing: templates cannot be listed'}
            </dd>
          </dl>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Templates</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://business.facebook.com/wa/manage/message-templates/"
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButtonClass}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Make a template in WhatsApp Manager
            </a>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={refresh.isPending || !data?.isConfigured}
              onClick={() => refresh.mutate()}
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={refresh.isPending ? 'animate-spin' : ''}
              />
              Refresh from Meta
            </button>
          </div>
        </div>
        <p className="text-sm text-text-muted">
          A template is the only message that may start a chat or follow up after 24 hours. Meta
          checks each one (usually within a day). Variables like {'{{1}}'} are filled in when it is
          sent: {'{{1}}'} starts as the person&apos;s first name, {'{{2}}'} as the company.
        </p>
        <FormError message={templates.error?.message ?? refresh.error?.message} />
        {templates.isSuccess && templates.data.length === 0 && (
          <p className="text-sm text-text-muted">No templates yet.</p>
        )}
        {templates.data?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted uppercase">
                <tr>
                  <th className="py-1 pr-3 font-medium">Name</th>
                  <th className="py-1 pr-3 font-medium">Language</th>
                  <th className="py-1 pr-3 font-medium">Kind</th>
                  <th className="py-1 pr-3 font-medium">Status</th>
                  <th className="py-1 font-medium">Text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.data.map((template) => (
                  <tr key={`${template.name}|${template.language}`} className="align-top">
                    <td className="py-2 pr-3 font-medium">{template.name}</td>
                    <td className="py-2 pr-3">{template.language}</td>
                    <td className="py-2 pr-3 capitalize">{template.category.toLowerCase()}</td>
                    <td className="py-2 pr-3">
                      <span className={STATUS_TONE[template.status] ?? 'text-text-muted'}>
                        {template.status.toLowerCase()}
                      </span>
                      {template.status === 'APPROVED' && !template.canSend && (
                        <span className="block text-xs text-text-muted">
                          The CRM cannot send it: {template.unsupported}
                        </span>
                      )}
                    </td>
                    <td className="max-w-md py-2 break-words whitespace-pre-wrap text-text-muted">
                      {template.bodyText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

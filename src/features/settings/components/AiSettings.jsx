import { useState } from 'react';
import {
  FormError,
  compactInputClass,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useAiSettings, useSaveAiSettings } from '../../insights/api.js';

// Small amounts keep their paise: one AI run costs well under a rupee.
const rupees = (paise) =>
  `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: paise < 10000 ? 2 : 0 })}`;
const TASK_LABELS = {
  summarizeAccount: 'Company summaries',
  assessLead: 'Lead score and next best action',
};

// What was spent this month, against the budget.
function Usage({ settings }) {
  const { usage, monthlyCapPaise, alertPercent } = settings;
  const share = Math.min(100, Math.round((usage.totalCostPaise / monthlyCapPaise) * 100));
  const tone = share >= 100 ? 'bg-danger' : share >= alertPercent ? 'bg-warning' : 'bg-success';
  return (
    <section className="max-w-2xl space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">This month</h2>
      <p>
        <span className="text-2xl font-semibold">{rupees(usage.totalCostPaise)}</span>
        <span className="text-text-muted">
          {' '}
          of {rupees(monthlyCapPaise)} · {usage.runs} AI {usage.runs === 1 ? 'run' : 'runs'}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Share of the AI budget used"
        aria-valuenow={share}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-page"
      >
        <div className={`h-full ${tone}`} style={{ width: `${share}%` }} />
      </div>
      {usage.byTask.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-text-muted uppercase">
            <tr>
              <th className="py-1 font-medium">Used for</th>
              <th className="py-1 font-medium">Runs</th>
              <th className="py-1 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usage.byTask.map((row) => (
              <tr key={row.task}>
                <td className="py-1">{TASK_LABELS[row.task] ?? row.task}</td>
                <td className="py-1">{row.runs}</td>
                <td className="py-1">{rupees(row.costPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!settings.isAiReady && (
        <p className="text-danger">
          AI is not set up yet: the key is missing on the server (OPENROUTER_API_KEY).
        </p>
      )}
    </section>
  );
}

// The form, started from the saved settings. Rendered with a key, so a save starts it afresh.
function SettingsForm({ settings, canEdit, save }) {
  const [cap, setCap] = useState(String(settings.monthlyCapPaise / 100));
  const [daily, setDaily] = useState(String(settings.dailyRunsPerUser));
  const [alert, setAlert] = useState(String(settings.alertPercent));
  const startModels = Object.fromEntries(
    settings.classes.map((item) => [
      item.key,
      { model: item.model, fallback: item.fallback ?? '' },
    ]),
  );
  const [models, setModels] = useState(startModels);
  const isChanged =
    cap !== String(settings.monthlyCapPaise / 100) ||
    daily !== String(settings.dailyRunsPerUser) ||
    alert !== String(settings.alertPercent) ||
    JSON.stringify(models) !== JSON.stringify(startModels);
  const errors = fieldErrorsFrom(save.error);
  const providers = [...new Set(settings.choices.map((choice) => choice.provider))];
  const setModel = (key, field, value) =>
    setModels({ ...models, [key]: { ...models[key], [field]: value } });

  const options = providers.map((provider) => (
    <optgroup key={provider} label={provider}>
      {settings.choices
        .filter((choice) => choice.provider === provider)
        .map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label} (₹{choice.inRupees} in / ₹{choice.outRupees} out)
          </option>
        ))}
    </optgroup>
  ));

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({
          monthlyCapPaise: Math.round(Number(cap) * 100),
          dailyRunsPerUser: Number(daily),
          alertPercent: Number(alert),
          models: Object.fromEntries(
            Object.entries(models).map(([key, value]) => [
              key,
              { model: value.model, fallback: value.fallback || null },
            ]),
          ),
        });
      }}
    >
      <fieldset disabled={!canEdit} className="space-y-3">
        <legend className="mb-1 font-semibold">Budget and limits</legend>
        <div className="flex flex-wrap items-start gap-4">
          {[
            ['Budget per month (₹)', cap, setCap, 100, 100000, errors.monthlyCapPaise],
            ['AI requests per person per day', daily, setDaily, 1, 1000, errors.dailyRunsPerUser],
            ['Warn me when this % is used', alert, setAlert, 10, 99, errors.alertPercent],
          ].map(([label, value, setValue, min, max, error]) => (
            <label key={label} className="block">
              <span className="mb-1 block text-sm font-medium">{label}</span>
              <input
                type="number"
                required
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={`${compactInputClass} w-36`}
              />
              {error && <span className="block text-sm text-danger">{error}</span>}
            </label>
          ))}
        </div>
        <p className="text-sm text-text-muted">
          At {alert || '…'}% of the budget you get a notification. At 100% the AI features pause
          until next month or until you raise the budget; everything else keeps working.
        </p>
      </fieldset>

      <fieldset disabled={!canEdit} className="space-y-3">
        <legend className="mb-1 font-semibold">Which model does which work</legend>
        <p className="text-sm text-text-muted">
          Prices are per 1 million tokens (about 7 lakh words), in and out. A dearer model is
          usually better at hard work and costs more for every run. The second choice is used only
          when the first one is not available.
        </p>
        {settings.classes.map((item) => (
          <div key={item.key} className="rounded-lg border border-border bg-surface p-3">
            <p className="font-medium">{item.label}</p>
            <p className="mb-2 text-sm text-text-muted">{item.usedFor}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Model</span>
                <select
                  aria-label={`${item.label}: model`}
                  value={models[item.key].model}
                  onChange={(event) => setModel(item.key, 'model', event.target.value)}
                  className={inputClass}
                >
                  {options}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Second choice</span>
                <select
                  aria-label={`${item.label}: second choice`}
                  value={models[item.key].fallback}
                  onChange={(event) => setModel(item.key, 'fallback', event.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {options}
                </select>
                {errors[`models.${item.key}.fallback`] && (
                  <span className="block text-sm text-danger">
                    {errors[`models.${item.key}.fallback`]}
                  </span>
                )}
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      <FormError message={save.error?.message} />
      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={!isChanged || save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          {isChanged && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setCap(String(settings.monthlyCapPaise / 100));
                setDaily(String(settings.dailyRunsPerUser));
                setAlert(String(settings.alertPercent));
                setModels(startModels);
                save.reset();
              }}
            >
              Reset
            </button>
          )}
          {save.isSuccess && !isChanged && (
            <span role="status" className="text-sm text-success">
              Saved. It applies from the next AI request.
            </span>
          )}
        </div>
      )}
    </form>
  );
}

// Settings → AI: what the AI cost this month, the budget and limits, and the models.
export default function AiSettings({ canEdit }) {
  // Kept here, not in the form: the form starts afresh after a save, and "Saved" must stay.
  const save = useSaveAiSettings();
  const settings = useAiSettings();
  return (
    <section className="space-y-5">
      <FormError message={settings.error?.message} />
      {settings.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {settings.data && (
        <>
          <Usage settings={settings.data} />
          <SettingsForm
            key={JSON.stringify([
              settings.data.monthlyCapPaise,
              settings.data.dailyRunsPerUser,
              settings.data.alertPercent,
              settings.data.classes,
            ])}
            settings={settings.data}
            canEdit={canEdit}
            save={save}
          />
        </>
      )}
    </section>
  );
}

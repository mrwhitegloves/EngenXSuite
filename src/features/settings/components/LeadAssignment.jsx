import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FormError,
  fieldErrorsFrom,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { apiRequest } from '../../../lib/apiClient.js';

const KEY = ['inbound-leads', 'assignment'];

const MODES = {
  off: ['Off', 'Nobody. The lead stays unassigned; the CEO and managers give it out by hand.'],
  round_robin_all: ['Round robin: all sales agents', 'Every sales agent in turn.'],
  round_robin_selected: ['Round robin: chosen people', 'Only the people ticked below, in turn.'],
  fixed: ['Always the same person', 'Every lead goes to one person.'],
  least_open: [
    'Fewest open leads',
    'The person with the fewest open leads: among the people ticked below, or among all sales agents when nobody is ticked.',
  ],
};

// The form, started from the saved rule. Rendered with a key, so a saved rule starts it afresh.
function RuleForm({ rule, canEdit, save }) {
  const [mode, setMode] = useState(rule.mode);
  const [userIds, setUserIds] = useState(rule.userIds);
  const [fixedUserId, setFixedUserId] = useState(rule.fixedUserId ?? '');
  const [awayUserIds, setAwayUserIds] = useState(rule.awayUserIds);
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const isChanged =
    mode !== rule.mode ||
    fixedUserId !== (rule.fixedUserId ?? '') ||
    !same(userIds, rule.userIds) ||
    !same(awayUserIds, rule.awayUserIds);
  const usesChosen = mode === 'round_robin_selected' || mode === 'least_open';
  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const errors = fieldErrorsFrom(save.error);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ mode, userIds, fixedUserId: fixedUserId || null, awayUserIds });
      }}
    >
      <fieldset disabled={!canEdit} className="space-y-2">
        <legend className="mb-1 font-semibold">Who gets a new lead?</legend>
        {rule.modes.map((item) => (
          <label key={item} className="flex items-start gap-2">
            <input
              type="radio"
              name="assignment-mode"
              className="mt-1 size-4 accent-brand"
              checked={mode === item}
              onChange={() => setMode(item)}
            />
            <span>
              <span className="font-medium">{MODES[item][0]}</span>
              <span className="block text-sm text-text-muted">{MODES[item][1]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === 'fixed' && (
        <label className="block max-w-sm">
          <span className="mb-1 block text-sm font-medium">The person who gets every lead</span>
          <select
            value={fixedUserId}
            disabled={!canEdit}
            onChange={(event) => setFixedUserId(event.target.value)}
            className={inputClass}
          >
            <option value="">Choose a person</option>
            {rule.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.roleName})
              </option>
            ))}
          </select>
          {errors.fixedUserId && <span className="text-sm text-danger">{errors.fixedUserId}</span>}
        </label>
      )}

      <fieldset disabled={!canEdit}>
        <legend className="mb-1 font-semibold">People</legend>
        <p className="mb-2 text-sm text-text-muted">
          “Away” takes someone out for now (on leave): they get no new lead until it is unticked.
          {usesChosen && ' “In the turn” chooses who takes part in the rule above.'}
        </p>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Person</th>
                {usesChosen && <th className="px-3 py-2 font-medium">In the turn</th>}
                <th className="px-3 py-2 font-medium">Away</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rule.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-2">
                    {user.name}
                    <span className="ml-2 text-xs text-text-muted">
                      {user.roleName}
                      {user.isAgent && ' · sales agent'}
                    </span>
                  </td>
                  {usesChosen && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        aria-label={`${user.name} is in the turn`}
                        checked={userIds.includes(user.id)}
                        onChange={() => toggle(userIds, setUserIds, user.id)}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand"
                      aria-label={`${user.name} is away`}
                      checked={awayUserIds.includes(user.id)}
                      onChange={() => toggle(awayUserIds, setAwayUserIds, user.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                setMode(rule.mode);
                setUserIds(rule.userIds);
                setFixedUserId(rule.fixedUserId ?? '');
                setAwayUserIds(rule.awayUserIds);
                save.reset();
              }}
            >
              Reset
            </button>
          )}
          {save.isSuccess && !isChanged && (
            <span role="status" className="text-sm text-success">
              Saved. It applies to the next lead that comes in.
            </span>
          )}
        </div>
      )}
    </form>
  );
}

// Settings → Lead assignment: who gets a lead that arrives by itself (a Meta lead ad).
export default function LeadAssignment({ canEdit }) {
  const queryClient = useQueryClient();
  // Kept here, not in the form: the form starts afresh after a save, and "Saved" must stay.
  const save = useMutation({
    mutationFn: (body) => apiRequest('/settings/lead-assignment', { method: 'PATCH', body }),
    onSuccess: (payload) => queryClient.setQueryData(KEY, payload),
  });
  const rule = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => apiRequest('/settings/lead-assignment', { signal }),
    select: (payload) => payload.data,
  });
  return (
    <section className="space-y-3">
      <p className="max-w-2xl text-sm text-text-muted">
        A lead that comes in by itself (from a Meta lead ad) is given to someone by this rule. The
        person is notified and gets a first follow-up task. A lead form can have its own owner
        (Settings → Lead forms), which comes before this rule.
      </p>
      <FormError message={rule.error?.message} />
      {rule.isPending && (
        <p role="status" className="text-text-muted">
          Loading…
        </p>
      )}
      {rule.data && (
        <RuleForm key={JSON.stringify(rule.data)} rule={rule.data} canEdit={canEdit} save={save} />
      )}
    </section>
  );
}

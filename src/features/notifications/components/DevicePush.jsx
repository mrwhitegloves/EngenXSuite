import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { disablePush, enablePush, getPushState } from '../../../lib/push.js';

const KEY = ['push-state'];

// Why the button is not offered, in the person's words.
const NOT_POSSIBLE = {
  unsupported:
    'This browser cannot show notifications when the app is closed. On an iPhone, first add the app to the Home Screen.',
  'not-configured': 'Notifications on the device are not set up on the server yet.',
  blocked:
    'Notifications are blocked for this site in the browser. Allow them in the browser’s site settings, then come back.',
};

// "On this device": let this browser show my notifications also when the app is closed.
// The choice is per browser: the laptop and the phone are switched on separately.
export default function DevicePush() {
  const queryClient = useQueryClient();
  const state = useQuery({ queryKey: KEY, queryFn: getPushState });
  const change = useMutation({
    mutationFn: (turnOn) => (turnOn ? enablePush() : disablePush()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const isOn = state.data === 'on';

  return (
    <section className="rounded-lg border border-border bg-surface p-4 text-sm">
      <h2 className="text-base font-semibold">On this device</h2>
      <p className="mt-1 text-text-muted">
        Show my notifications on this device also when the app is not open. Switch it on in each
        browser where you want it.
      </p>
      {NOT_POSSIBLE[state.data] ? (
        <p className="mt-3 text-text-muted">{NOT_POSSIBLE[state.data]}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={isOn ? secondaryButtonClass : primaryButtonClass}
            disabled={state.isPending || change.isPending}
            onClick={() => change.mutate(!isOn)}
          >
            {change.isPending ? 'One moment…' : isOn ? 'Switch off here' : 'Switch on here'}
          </button>
          {state.isSuccess && (
            <span role="status" className={isOn ? 'text-success' : 'text-text-muted'}>
              {isOn ? 'On in this browser' : 'Off in this browser'}
            </span>
          )}
        </div>
      )}
      <div className="mt-2">
        <FormError message={change.error?.message} />
      </div>
    </section>
  );
}

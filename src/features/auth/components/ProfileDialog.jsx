import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient.js';
import { CURRENT_USER_KEY, useAuth } from '../../../hooks/useAuth.js';
import Dialog from '../../../components/shared/Dialog.jsx';
import AvatarUploader from '../../../components/shared/AvatarUploader.jsx';
import { secondaryButtonClass } from '../../../components/shared/form.jsx';

// "My profile": the signed-in user's own details and profile picture.
export default function ProfileDialog({ onClose }) {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();

  // Both requests answer with the updated user, which replaces the cached one, so the new
  // picture appears everywhere at once. The users list is reloaded for the same reason.
  function applyUpdatedUser(payload) {
    queryClient.setQueryData(CURRENT_USER_KEY, payload.data);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }

  async function upload(file) {
    const body = new FormData();
    body.append('file', file);
    applyUpdatedUser(await apiRequest('/auth/me/avatar', { method: 'POST', body }));
  }

  async function remove() {
    applyUpdatedUser(await apiRequest('/auth/me/avatar', { method: 'DELETE' }));
  }

  return (
    <Dialog
      open
      title="My profile"
      onClose={onClose}
      footer={
        <>
          {/* On a phone the top bar has no room for its own sign-out button; it is here. */}
          <button
            type="button"
            onClick={() => signOut()}
            className={`${secondaryButtonClass} mr-auto`}
          >
            Sign out
          </button>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Close
          </button>
        </>
      }
    >
      <AvatarUploader name={user.name} url={user.avatarUrl} onUpload={upload} onRemove={remove} />
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-text-muted">Name</dt>
        <dd>{user.name}</dd>
        <dt className="text-text-muted">Email</dt>
        <dd className="break-all">{user.email}</dd>
        <dt className="text-text-muted">Account type</dt>
        <dd>{user.role.name}</dd>
      </dl>
    </Dialog>
  );
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/apiClient.js';
import AvatarUploader from '../../../components/shared/AvatarUploader.jsx';
import Dialog from '../../../components/shared/Dialog.jsx';
import {
  Field,
  FormError,
  fieldErrorsFrom,
  generatePassword,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCreateUser, useUpdateUser, useUserFormOptions } from '../api.js';
import PasswordField from './PasswordField.jsx';

const MIN_PASSWORD = 8;

function initialForm(user) {
  if (!user) {
    return {
      name: '',
      email: '',
      phone: '',
      roleId: '',
      managerId: '',
      status: 'active',
      password: generatePassword(),
    };
  }
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    roleId: user.role.id,
    managerId: user.managerId ?? '',
    status: user.status === 'deactivated' ? 'deactivated' : 'active',
    // Empty means "keep the current password".
    password: '',
  };
}

/** Only the fields whose value differs from the user being edited. */
function changedFields(form, user) {
  const before = initialForm(user);
  const changes = {};
  for (const field of ['name', 'email', 'roleId', 'status']) {
    if (form[field] !== before[field]) changes[field] = form[field];
  }
  // Optional fields: an emptied field is sent as null, which clears it.
  for (const field of ['phone', 'managerId']) {
    if (form[field] !== before[field]) changes[field] = form[field] || null;
  }
  if (form.password) changes.password = form.password;
  return changes;
}

/**
 * One form for both "New user" and "Edit user": name, login email, password, account type,
 * who they report to, mobile number, picture and status.
 * The parent renders it with a `key`, so each opening starts with fresh values.
 */
export default function UserFormDialog({ user, isSelf, onClose }) {
  const isEditing = Boolean(user);
  const [form, setForm] = useState(() => initialForm(user));
  const options = useUserFormOptions(true);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = isEditing ? updateUser : createUser;
  const errors = fieldErrorsFrom(mutation.error);

  // Profile picture: uploaded from this computer to storage; the list reloads to show it.
  const queryClient = useQueryClient();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);
  async function uploadAvatar(file) {
    const body = new FormData();
    body.append('file', file);
    const payload = await apiRequest(`/users/${user.id}/avatar`, { method: 'POST', body });
    setAvatarUrl(payload.data.avatarUrl);
    queryClient.invalidateQueries({ queryKey: ['users'] });
    // If the administrator is editing their own account, their top-bar picture changes too.
    if (isSelf) queryClient.invalidateQueries({ queryKey: ['auth'] });
  }
  async function removeAvatar() {
    await apiRequest(`/users/${user.id}/avatar`, { method: 'DELETE' });
    setAvatarUrl(null);
    queryClient.invalidateQueries({ queryKey: ['users'] });
    if (isSelf) queryClient.invalidateQueries({ queryKey: ['auth'] });
  }

  const set = (field) => (eventOrValue) =>
    setForm((current) => ({
      ...current,
      [field]: eventOrValue?.target ? eventOrValue.target.value : eventOrValue,
    }));

  const changes = isEditing ? changedFields(form, user) : null;
  const passwordOk = isEditing
    ? form.password === '' || form.password.length >= MIN_PASSWORD
    : form.password.length >= MIN_PASSWORD;
  const canSubmit =
    form.name &&
    form.email &&
    form.roleId &&
    passwordOk &&
    (!isEditing || Object.keys(changes).length > 0);

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    if (isEditing) {
      updateUser.mutate({ id: user.id, ...changes }, { onSuccess: onClose });
      return;
    }
    createUser.mutate(
      {
        name: form.name,
        email: form.email,
        password: form.password,
        roleId: form.roleId,
        // Empty optional values are left out instead of being sent as empty text.
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.managerId ? { managerId: form.managerId } : {}),
      },
      { onSuccess: onClose },
    );
  }

  // The current account type is always offered, even when this person could not assign it anew.
  const roles = options.data?.roles ?? [];
  const roleChoices =
    isEditing && !roles.some((role) => role.id === user.role.id)
      ? [{ id: user.role.id, name: user.role.name }, ...roles]
      : roles;
  const managers = (options.data?.managers ?? []).filter((manager) => manager.id !== user?.id);

  return (
    <Dialog
      open
      title={isEditing ? `Edit user: ${user.name}` : 'New user'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={!canSubmit || mutation.isPending}
            className={primaryButtonClass}
          >
            {mutation.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create user'}
          </button>
        </>
      }
    >
      {/* The picture is saved the moment it is chosen, apart from the rest of the form. */}
      {isEditing ? (
        <div className="mb-5 border-b border-border pb-5">
          <AvatarUploader
            name={user.name}
            url={avatarUrl}
            onUpload={uploadAvatar}
            onRemove={removeAvatar}
          />
        </div>
      ) : (
        <p className="mb-4 text-sm text-text-muted">
          A profile picture can be added after the user is created (Edit), or by the user from their
          own profile.
        </p>
      )}
      <form id="user-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError
          message={
            options.error?.message ?? (Object.keys(errors).length ? null : mutation.error?.message)
          }
        />
        <Field label="Full name" error={errors.name}>
          {(props) => (
            <input {...props} value={form.name} onChange={set('name')} className={inputClass} />
          )}
        </Field>
        <Field label="Login email" hint="The user signs in with this email." error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={set('email')}
              className={inputClass}
            />
          )}
        </Field>
        <PasswordField
          label={isEditing ? 'New password' : 'Password'}
          hint={
            isEditing
              ? `Leave empty to keep the current password. At least ${MIN_PASSWORD} characters.`
              : `At least ${MIN_PASSWORD} characters.`
          }
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <Field label="Account type" error={errors.roleId}>
          {(props) => (
            <select
              {...props}
              value={form.roleId}
              onChange={set('roleId')}
              disabled={options.isPending}
              className={inputClass}
            >
              <option value="">{options.isPending ? 'Loading…' : 'Choose an account type'}</option>
              {roleChoices.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="Reports to"
          hint="A manager sees the records of the people who report to them."
          error={errors.managerId}
        >
          {(props) => (
            <select
              {...props}
              value={form.managerId}
              onChange={set('managerId')}
              className={inputClass}
            >
              <option value="">
                {options.data?.canLeaveManagerEmpty || isEditing ? 'Nobody' : 'Me'}
              </option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {isEditing && !isSelf && (
          <Field label="Status" hint="A deactivated user is signed out and cannot sign in.">
            {(props) => (
              <select
                {...props}
                value={form.status}
                onChange={set('status')}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
              </select>
            )}
          </Field>
        )}
        <Field
          label="Mobile number (optional)"
          hint="For example +919876543210"
          error={errors.phone}
        >
          {(props) => (
            <input
              {...props}
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className={inputClass}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

import { useState } from 'react';
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
import { useCreateUser, useUserFormOptions } from '../api.js';
import PasswordField from './PasswordField.jsx';

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  roleId: '',
  managerId: '',
  password: generatePassword(),
});

// The "New user" form: login email, first password, account type and the rest.
export default function CreateUserDialog({ open, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const options = useUserFormOptions(open);
  const createUser = useCreateUser();
  const errors = fieldErrorsFrom(createUser.error);

  const set = (field) => (eventOrValue) =>
    setForm((current) => ({
      ...current,
      [field]: eventOrValue?.target ? eventOrValue.target.value : eventOrValue,
    }));

  function close() {
    createUser.reset();
    setForm(emptyForm());
    onClose();
  }

  function handleSubmit(event) {
    event.preventDefault();
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
      { onSuccess: close },
    );
  }

  const roles = options.data?.roles ?? [];
  const canSubmit = form.name && form.email && form.roleId && form.password.length >= 10;

  return (
    <Dialog
      open={open}
      title="New user"
      onClose={close}
      footer={
        <>
          <button type="button" onClick={close} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-user-form"
            disabled={!canSubmit || createUser.isPending}
            className={primaryButtonClass}
          >
            {createUser.isPending ? 'Creating…' : 'Create user'}
          </button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError
          message={
            options.error?.message ??
            (Object.keys(errors).length ? null : createUser.error?.message)
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
        <PasswordField value={form.password} onChange={set('password')} error={errors.password} />
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
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {options.data?.canChooseManager && (
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
                <option value="">Nobody</option>
                {options.data.managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
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

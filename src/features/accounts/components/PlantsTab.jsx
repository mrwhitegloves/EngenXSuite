import { useState } from 'react';
import { ChevronDown, ChevronRight, Factory, Pencil, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import DataTable from '../../../components/shared/DataTable.jsx';
import EmptyState from '../../../components/shared/states/EmptyState.jsx';
import {
  FormError,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../../components/shared/form.jsx';
import { useCan } from '../../../hooks/useCan.js';
import {
  useAccountContacts,
  useAccountPlants,
  useMachineActions,
  usePlantActions,
  usePlantMachines,
  usePlantUnits,
  useUnitActions,
} from '../api.js';
import RecordFormDialog, { numberOrNull, onlyFilled, textOrNull } from './RecordFormDialog.jsx';

const rowButton =
  'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-text-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand';
const MATURITY_LABELS = {
  none: 'None',
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
const LEVEL_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const DATA_LABELS = { none: 'No data', partial: 'Some data', full: 'Full data' };
const HEADS = [
  ['plantHead', 'plantHeadId', 'Plant head'],
  ['maintenanceHead', 'maintenanceHeadId', 'Maintenance head'],
  ['productionHead', 'productionHeadId', 'Production head'],
  ['digitalHead', 'digitalHeadId', 'Digital / IT head'],
];
const text = (value) => (value === null || value === undefined ? '' : String(value));

// ── Plant form ──────────────────────────────────────────────────────────────────────────────

function plantFields(contacts) {
  const people = contacts.map((contact) => [
    contact.id,
    contact.designation ? `${contact.name} (${contact.designation})` : contact.name,
  ]);
  const headHint =
    contacts.length === 0
      ? 'Add people in the People tab first, then choose them here.'
      : undefined;
  return [
    { name: 'name', label: 'Plant name', required: true, wide: true },
    { name: 'city', label: 'City', serverName: 'location.city' },
    { name: 'state', label: 'State', serverName: 'location.state' },
    { name: 'plantType', label: 'Plant type', placeholder: 'For example: Forging' },
    { name: 'process', label: 'Main process' },
    { name: 'size', label: 'Size', placeholder: 'Area or number of people' },
    { name: 'productionCapacity', label: 'Production capacity' },
    ...HEADS.map(([, idField, label], index) => ({
      name: idField,
      label,
      type: 'select',
      choices: people,
      emptyLabel: 'Not known',
      hint: index === 0 ? headHint : undefined,
    })),
    { name: 'existingAutomation', label: 'Automation in place' },
    { name: 'plcScada', label: 'PLC / SCADA' },
    { name: 'mesErp', label: 'MES / ERP' },
    {
      name: 'digitalMaturity',
      label: 'Digital maturity',
      type: 'select',
      choices: Object.entries(MATURITY_LABELS),
      emptyLabel: 'Not known',
    },
  ];
}

function plantToForm(plant) {
  return {
    name: text(plant?.name),
    city: text(plant?.location?.city),
    state: text(plant?.location?.state),
    plantType: text(plant?.plantType),
    process: text(plant?.process),
    size: text(plant?.size),
    productionCapacity: text(plant?.productionCapacity),
    ...Object.fromEntries(HEADS.map(([view, idField]) => [idField, text(plant?.[view]?.id)])),
    existingAutomation: text(plant?.existingAutomation),
    plcScada: text(plant?.plcScada),
    mesErp: text(plant?.mesErp),
    digitalMaturity: text(plant?.digitalMaturity),
  };
}

function plantToBody(values) {
  return {
    name: values.name.trim(),
    location: { city: textOrNull(values.city), state: textOrNull(values.state) },
    plantType: textOrNull(values.plantType),
    process: textOrNull(values.process),
    size: textOrNull(values.size),
    productionCapacity: textOrNull(values.productionCapacity),
    ...Object.fromEntries(HEADS.map(([, idField]) => [idField, textOrNull(values[idField])])),
    existingAutomation: textOrNull(values.existingAutomation),
    plcScada: textOrNull(values.plcScada),
    mesErp: textOrNull(values.mesErp),
    digitalMaturity: textOrNull(values.digitalMaturity),
  };
}

// ── Machine form ────────────────────────────────────────────────────────────────────────────

const MACHINE_FIELDS = [
  {
    name: 'name',
    label: 'Machine',
    required: true,
    placeholder: 'For example: CNC turning centre',
  },
  {
    name: 'quantity',
    label: 'How many',
    type: 'number',
    required: true,
    hint: 'Identical machines are one row: 32 CNC machines = 32 here.',
  },
  { name: 'machineType', label: 'Type' },
  { name: 'manufacturer', label: 'Manufacturer' },
  { name: 'model', label: 'Model' },
  { name: 'controller', label: 'Controller' },
  { name: 'plc', label: 'PLC' },
  { name: 'protocol', label: 'Protocol', placeholder: 'For example: OPC UA, Modbus' },
  { name: 'yearInstalled', label: 'Year installed', type: 'number' },
  { name: 'condition', label: 'Condition' },
  {
    name: 'criticality',
    label: 'How critical',
    type: 'select',
    choices: Object.entries(LEVEL_LABELS),
    emptyLabel: 'Not known',
  },
  {
    name: 'dataAvailability',
    label: 'Data available',
    type: 'select',
    choices: Object.entries(DATA_LABELS),
    emptyLabel: 'Not known',
  },
  {
    name: 'existingSensors',
    label: 'Sensors already fitted',
    wide: true,
    hint: 'Separate with commas, for example: Vibration, Temperature',
  },
];

// "Machining › Line 1" for a line inside a department; just the name otherwise.
function unitLabel(unit, units) {
  const parent = unit.parentId && units.find((item) => item.id === unit.parentId);
  return parent ? `${parent.name} › ${unit.name}` : unit.name;
}

// The machine form's fields; the place in the plant is offered once the plant has units.
function machineFields(units) {
  if (units.length === 0) return MACHINE_FIELDS;
  const place = {
    name: 'unitId',
    label: 'Where in the plant',
    type: 'select',
    choices: units.map((unit) => [unit.id, unitLabel(unit, units)]),
    emptyLabel: 'Not placed',
  };
  return [...MACHINE_FIELDS.slice(0, 2), place, ...MACHINE_FIELDS.slice(2)];
}

function machineToForm(machine) {
  return {
    ...Object.fromEntries(MACHINE_FIELDS.map((field) => [field.name, text(machine?.[field.name])])),
    unitId: text(machine?.unitId),
    quantity: text(machine?.quantity ?? 1),
    existingSensors: (machine?.existingSensors ?? []).join(', '),
  };
}

function machineToBody(values) {
  const body = Object.fromEntries(
    MACHINE_FIELDS.map((field) => [field.name, textOrNull(values[field.name])]),
  );
  return {
    ...body,
    name: values.name.trim(),
    unitId: textOrNull(values.unitId),
    quantity: numberOrNull(values.quantity),
    yearInstalled: numberOrNull(values.yearInstalled),
    existingSensors: values.existingSensors
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

// The departments and production lines of one plant, shown when the plant is opened.
// A line sits inside a department or directly in the plant.
function Units({ plant }) {
  const can = useCan();
  const units = usePlantUnits(plant.id);
  const actions = useUnitActions(plant.id);
  // null = closed, { type } = the add form for that kind, or the unit being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const all = units.data ?? [];
  const departments = all.filter((unit) => unit.type === 'department');
  const linesOf = (departmentId) =>
    all.filter((unit) => unit.type === 'line' && unit.parentId === departmentId);
  const isNew = Boolean(formTarget) && !formTarget.id;
  const save = isNew ? actions.create : actions.update;
  const isLine = formTarget?.type === 'line';

  const fields = [
    { name: 'name', label: isLine ? 'Line name' : 'Department name', required: true },
    ...(isLine
      ? [
          {
            name: 'parentId',
            label: 'Department',
            type: 'select',
            choices: departments.map((unit) => [unit.id, unit.name]),
            emptyLabel: 'Directly in the plant',
          },
        ]
      : []),
  ];
  const toBody = (values) => ({
    name: values.name.trim(),
    ...(isLine ? { parentId: textOrNull(values.parentId) } : {}),
  });

  const addButton = (type, label) => (
    <button
      type="button"
      className={secondaryButtonClass}
      onClick={() => {
        actions.create.reset();
        setFormTarget({ type });
      }}
    >
      <Plus size={16} aria-hidden="true" />
      {label}
    </button>
  );

  const row = (unit, isNested = false) => (
    <li
      key={unit.id}
      className={`flex flex-wrap items-center justify-between gap-2 py-1.5 ${isNested ? 'pl-6' : ''}`}
    >
      <span>
        <span className={unit.type === 'department' ? 'font-medium' : ''}>{unit.name}</span>
        <span className="ml-2 text-xs text-text-muted">
          {unit.type === 'department' ? 'Department' : 'Line'}
        </span>
      </span>
      <span className="flex gap-2">
        {can('plants', 'edit') && (
          <button
            type="button"
            className={rowButton}
            aria-label={`Edit ${unit.name}`}
            onClick={() => {
              actions.update.reset();
              setFormTarget(unit);
            }}
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </button>
        )}
        {can('plants', 'delete') && (
          <button
            type="button"
            className={rowButton}
            aria-label={`Delete ${unit.name}`}
            onClick={() => {
              actions.remove.reset();
              setDeleteTarget(unit);
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        )}
      </span>
    </li>
  );

  return (
    <div className="space-y-2 border-t border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Departments and lines</h4>
        {can('plants', 'create') && (
          <div className="flex flex-wrap gap-2">
            {addButton('department', 'Add department')}
            {addButton('line', 'Add line')}
          </div>
        )}
      </div>
      <FormError message={units.error?.message} />
      {units.isPending && (
        <p role="status" className="text-sm text-text-muted">
          Loading departments and lines…
        </p>
      )}
      {units.isSuccess && all.length === 0 && (
        <p className="text-sm text-text-muted">
          No departments or lines yet. Add them to say where each machine stands.
        </p>
      )}
      {all.length > 0 && (
        <ul
          aria-label={`Departments and lines of ${plant.name}`}
          className="divide-y divide-border text-sm"
        >
          {departments.flatMap((department) => [
            row(department),
            ...linesOf(department.id).map((line) => row(line, true)),
          ])}
          {linesOf(null).map((line) => row(line))}
        </ul>
      )}

      {formTarget && (
        <RecordFormDialog
          key={isNew ? `new-${formTarget.type}` : formTarget.id}
          title={
            isNew
              ? `Add ${isLine ? 'line' : 'department'} to ${plant.name}`
              : `Edit ${formTarget.name}`
          }
          fields={fields}
          initial={{ name: text(formTarget.name), parentId: text(formTarget.parentId) }}
          isNew={isNew}
          toBody={toBody}
          save={save}
          saveLabel={isNew ? 'Add' : 'Save changes'}
          onClose={() => setFormTarget(null)}
          onSave={(body) =>
            save.mutate(
              isNew
                ? { type: formTarget.type, ...onlyFilled(body) }
                : { id: formTarget.id, ...body },
              { onSuccess: () => setFormTarget(null) },
            )
          }
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete this ${deleteTarget?.type === 'line' ? 'line' : 'department'}?`}
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> will be removed from {plant.name}. Its machines
          {deleteTarget?.type === 'department' && ' and lines'} stay in the plant; they only stop
          being grouped here.
        </p>
      </ConfirmDialog>
    </div>
  );
}

// The machines of one plant, shown when the plant is opened.
function Machines({ plant }) {
  const can = useCan();
  const machines = usePlantMachines(plant.id, true);
  const units = usePlantUnits(plant.id).data ?? [];
  const placeOf = (unitId) => {
    const unit = units.find((item) => item.id === unitId);
    return unit ? unitLabel(unit, units) : null;
  };
  const actions = useMachineActions(plant.id);
  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const rows = machines.data ?? [];
  const isNew = formTarget === 'new';
  const save = isNew ? actions.create : actions.update;

  const columns = [
    {
      key: 'name',
      header: 'Machine',
      render: (row) => (
        <>
          <p className="font-medium">
            {row.name}
            {row.quantity > 1 && <span className="ml-2 text-text-muted">× {row.quantity}</span>}
          </p>
          <p className="text-text-muted">
            {[row.machineType, row.manufacturer, row.model].filter(Boolean).join(' · ') || '—'}
          </p>
        </>
      ),
    },
    { key: 'place', header: 'Where', render: (row) => placeOf(row.unitId) ?? '—' },
    {
      key: 'control',
      header: 'Controls',
      render: (row) => [row.controller, row.plc, row.protocol].filter(Boolean).join(' · ') || '—',
    },
    {
      key: 'age',
      header: 'Age',
      className: 'whitespace-nowrap',
      render: (row) => (row.ageYears === null ? '—' : `${row.ageYears} yr`),
    },
    {
      key: 'criticality',
      header: 'Critical',
      render: (row) => LEVEL_LABELS[row.criticality] ?? '—',
    },
    { key: 'data', header: 'Data', render: (row) => DATA_LABELS[row.dataAvailability] ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      hideHeader: true,
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('plants', 'edit') && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Edit ${row.name}`}
              onClick={() => {
                actions.update.reset();
                setFormTarget(row);
              }}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          )}
          {can('plants', 'delete') && (
            <button
              type="button"
              className={rowButton}
              aria-label={`Delete ${row.name}`}
              onClick={() => {
                actions.remove.reset();
                setDeleteTarget(row);
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2 border-t border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Machines</h4>
        {can('plants', 'create') && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              actions.create.reset();
              setFormTarget('new');
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Add machine
          </button>
        )}
      </div>
      <FormError message={machines.error?.message} />
      {machines.isPending && (
        <p role="status" className="text-sm text-text-muted">
          Loading machines…
        </p>
      )}
      {machines.isSuccess && rows.length === 0 && (
        <p className="text-sm text-text-muted">No machines listed for this plant yet.</p>
      )}
      {rows.length > 0 && (
        <DataTable caption={`Machines of ${plant.name}`} columns={columns} rows={rows} />
      )}

      {formTarget && (
        <RecordFormDialog
          key={isNew ? 'new' : formTarget.id}
          wide
          title={isNew ? `Add machine to ${plant.name}` : `Edit ${formTarget.name}`}
          fields={machineFields(units)}
          initial={machineToForm(isNew ? null : formTarget)}
          isNew={isNew}
          toBody={machineToBody}
          save={save}
          saveLabel={isNew ? 'Add machine' : 'Save changes'}
          onClose={() => setFormTarget(null)}
          onSave={(body) =>
            save.mutate(isNew ? onlyFilled(body) : { id: formTarget.id, ...body }, {
              onSuccess: () => setFormTarget(null),
            })
          }
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this machine?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> will be removed from {plant.name}.
        </p>
      </ConfirmDialog>
    </div>
  );
}

// The Plants tab of Account 360: the company's sites, each with its people and machines.
export default function PlantsTab({ accountId }) {
  const can = useCan();
  const plants = useAccountPlants(accountId);
  const contacts = useAccountContacts(accountId);
  const actions = usePlantActions(accountId);
  const [openPlantId, setOpenPlantId] = useState(null);
  const [formTarget, setFormTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = plants.data ?? [];
  const isNew = formTarget === 'new';
  const save = isNew ? actions.create : actions.update;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Plants</h2>
        {can('plants', 'create') && (
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              actions.create.reset();
              setFormTarget('new');
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Add plant
          </button>
        )}
      </div>

      <FormError message={plants.error?.message} />
      {plants.isPending && (
        <p role="status" className="text-text-muted">
          Loading plants…
        </p>
      )}
      {plants.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Factory}
          title="No plants yet"
          description="Add this company’s sites. Each plant has its own people, departments, lines and machines."
        />
      )}

      <ul className="space-y-3">
        {rows.map((plant) => {
          const isOpen = plant.id === openPlantId;
          const Chevron = isOpen ? ChevronDown : ChevronRight;
          const place = [plant.location?.city, plant.location?.state].filter(Boolean).join(', ');
          const heads = HEADS.filter(([view]) => plant[view]);
          return (
            <li key={plant.id} className="rounded-lg border border-border bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 p-3">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenPlantId(isOpen ? null : plant.id)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <Chevron
                    size={18}
                    className="mt-0.5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{plant.name}</span>
                    <span className="block text-sm text-text-muted">
                      {[place, plant.plantType, MATURITY_LABELS[plant.digitalMaturity]]
                        .filter(Boolean)
                        .join(' · ') || 'No details yet'}
                    </span>
                    <span className="block text-sm text-text-muted">
                      {plant.machineCount === 0
                        ? 'No machines listed'
                        : `${plant.machineCount} ${plant.machineCount === 1 ? 'machine' : 'machines'}`}
                    </span>
                  </span>
                </button>
                <div className="flex gap-2">
                  {can('plants', 'edit') && (
                    <button
                      type="button"
                      className={rowButton}
                      aria-label={`Edit ${plant.name}`}
                      onClick={() => {
                        actions.update.reset();
                        setFormTarget(plant);
                      }}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </button>
                  )}
                  {can('plants', 'delete') && (
                    <button
                      type="button"
                      className={rowButton}
                      aria-label={`Delete ${plant.name}`}
                      onClick={() => {
                        actions.remove.reset();
                        setDeleteTarget(plant);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <>
                  <dl className="grid gap-x-6 gap-y-2 border-t border-border p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    {heads.length === 0 && (
                      <p className="text-text-muted sm:col-span-2 lg:col-span-4">
                        No plant people chosen yet. Use Edit to pick them from the company’s people.
                      </p>
                    )}
                    {heads.map(([view, , label]) => (
                      <div key={view}>
                        <dt className="text-text-muted">{label}</dt>
                        <dd>{plant[view].name}</dd>
                      </div>
                    ))}
                    {[
                      ['Process', plant.process],
                      ['Capacity', plant.productionCapacity],
                      ['Automation', plant.existingAutomation],
                      ['PLC / SCADA', plant.plcScada],
                      ['MES / ERP', plant.mesErp],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-text-muted">{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                  <Units plant={plant} />
                  <Machines plant={plant} />
                </>
              )}
            </li>
          );
        })}
      </ul>

      {formTarget && (
        <RecordFormDialog
          key={isNew ? 'new' : formTarget.id}
          wide
          title={isNew ? 'Add plant' : `Edit ${formTarget.name}`}
          fields={plantFields(contacts.data ?? [])}
          initial={plantToForm(isNew ? null : formTarget)}
          isNew={isNew}
          toBody={plantToBody}
          save={save}
          saveLabel={isNew ? 'Add plant' : 'Save changes'}
          onClose={() => setFormTarget(null)}
          onSave={(body) =>
            save.mutate(isNew ? onlyFilled(body) : { id: formTarget.id, ...body }, {
              onSuccess: () => setFormTarget(null),
            })
          }
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this plant?"
        confirmLabel="Delete"
        isBusy={actions.remove.isPending}
        error={actions.remove.error?.message}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      >
        <p>
          <strong>{deleteTarget?.name}</strong> and its machines will disappear. The company and its
          people stay.
        </p>
      </ConfirmDialog>
    </section>
  );
}

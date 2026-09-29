import { describe, expect, it } from 'vitest';
import { applyCommand, validateState } from '../src/domain/engine';
import { createEmptyState, createDemoState } from '../src/domain/seed';
import { cents, whatsapp } from '../src/domain/helpers';
import {
  accountBalance, commercialSummary, convertQuantity, costTotal, financialSummary,
  orderBalance, orderTotal, purchaseBalance, responseDeadline,
} from '../src/domain/selectors';
import type {
  Account, AppState, Client, Command, CostSheet, Inquiry, MoneyRecord, Order, Product,
  Purchase, Task,
} from '../src/domain/types';

const at = '2026-09-29T15:00:00.000Z';
const date = '2026-09-29';
const recordBase = (id: string) => ({ id, revision: 0, createdAt: at, updatedAt: at });

function run(state: AppState, command: Command, requestId = crypto.randomUUID(), commandAt = at) {
  return applyCommand(state, { id: requestId, actor: 'ana-ficticia', at: commandAt, expectedStateRevision: state.revision, command });
}

function client(overrides: Partial<Client> = {}): Client {
  return { ...recordBase('cliente-ficticio'), name: 'Cliente de prueba', type: 'Persona', phone: '', email: '', instagram: '',
    origin: 'Feria', originEvidence: 'Caso ficticio', preferredChannel: 'WhatsApp', contacts: [], preferences: '',
    preferencesSource: '', consent: 'No consta', consentEvidence: '', consentAt: '', notes: '', ...overrides };
}

function inquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return { ...recordBase('consulta-ficticia'), clientId: null, contactName: 'Contacto de prueba', contact: '',
    summary: 'Consulta inicial de ejemplo', modality: 'Por definir', need: 'Por conocer', needSource: '', channel: 'WhatsApp',
    receivedAt: at, respondedAt: null, responseDue: null, ruleVersion: null, requestedDate: '', responsible: 'Ana',
    status: 'Por responder', waitingClient: false, nextAction: 'Consultar qué necesita', actionDate: date, reason: '',
    confirmedAt: null, ...overrides };
}

function order(overrides: Partial<Order> = {}): Order {
  return { ...recordBase('pedido-ficticio'), code: 'P-PRUEBA', clientId: null, contactName: 'Persona de prueba', inquiryId: null,
    modality: 'Productos', need: 'Regalo', status: 'Borrador', responsible: 'Ana', deliveryDate: '2026-10-03', deliveryTime: '16:00',
    location: 'Lugar ficticio', deliveryMode: 'Retiro', lines: [{ id: 'linea-ficticia', referenceId: null, referenceType: 'custom',
      name: 'Producto de prueba', quantity: 24, unit: 'unidad', unitsPerPack: 1, baseQuantity: 1, unitPrice: 1000,
      priceKind: 'Aprobado', attributes: 'Contenido acordado', distribution: [], sourceVersion: null, costVersionId: null, notes: '' }],
    scope: [], attendees: null, duration: '', eventId: null, parentId: null, transport: 0, extra: 0, discount: 0, total: 24000,
    paymentTerms: 'Adelanto acordado según el caso', changesTerms: 'Consultar antes de variar contenido', customerNotes: '', internalNotes: '',
    acceptedAt: null, acceptedChannel: '', capacityCheckedAt: null, capacityCheckedBy: null, confirmedAt: null, deliveredAt: null,
    dueDate: '2026-10-03', cancelReason: '', cancelCharge: 0, versions: [], costEstimate: null, costReviewed: false,
    costRevision: 0, isSimulation: false, ...overrides };
}

function account(overrides: Partial<Account> = {}): Account {
  return { ...recordBase('cuenta-ficticia'), name: 'Caja de prueba', opening: 0, openingDate: '2026-09-01',
    source: 'Saldo inicial ficticio', active: true, ...overrides };
}

function purchase(overrides: Partial<Purchase> = {}): Purchase {
  return { ...recordBase('compra-ficticia'), description: 'Insumos de prueba', amount: 10000, businessAmount: 10000,
    date, category: 'Insumos', supplierId: null, dueDate: '2026-10-03', orderIds: [], eventId: null, quantity: null,
    unit: '', notes: '', status: 'Vigente', adjustments: [], allocations: [], ...overrides };
}

function movement(overrides: Partial<MoneyRecord> = {}): MoneyRecord {
  return { ...recordBase(crypto.randomUUID()), kind: 'Cobro', amount: 12000, date, accountId: 'cuenta-ficticia',
    toAccountId: null, method: 'Efectivo', reference: 'Comprobante ficticio', notes: '', allocations: [{ entityId: 'pedido-ficticio', amount: 12000 }],
    reversalOf: null, reversedBy: null, direction: 'Entrada', requestId: crypto.randomUUID(), ...overrides };
}

function product(overrides: Partial<Product> = {}): Product {
  return { ...recordBase('producto-ficticio'), name: 'Alfajor de prueba', family: 'Alfajores', description: 'Producto ficticio para pruebas',
    culturalDescription: '', ingredients: 'Ingredientes de prueba', allergens: 'Por confirmar', conservation: 'Por confirmar',
    attributes: { filling: 'Manjar', cacao: '', shape: 'Redondo', size: 'Regular', coverage: '', decoration: '', presentation: 'Caja' },
    variants: [], unit: 'unidad', baseQuantity: 1, price: 1000, priceKind: 'Aprobado', sourcePage: 1, sourceDocument: 'Prueba',
    sourceHash: '', status: 'Aprobado', priority: false, available: 'Por encargo', preparationMinutes: null, validFrom: date,
    approvedBy: ['Mabel', 'Ana'], photo: '', notes: '', history: [], ...overrides };
}

function task(overrides: Partial<Task> = {}): Task {
  return { ...recordBase('tarea-ficticia'), title: 'Consultar satisfacción', date, time: '15:00', minutes: null, responsible: 'Ana',
    collaborator: '', orderId: null, clientId: 'cliente-ficticio', eventId: null, kind: 'Seguimiento', status: 'Pendiente', resource: '',
    resourceStatus: 'No aplica', purpose: 'Atender solicitud/pedido', notes: '', result: '', ...overrides };
}

function sheet(overrides: Partial<CostSheet> = {}): CostSheet {
  return { ...recordBase('costo-ficticio'), referenceId: 'producto-ficticio', type: 'Producto', name: 'Costo de prueba', yield: 2,
    ingredients: [{ id: 'ingrediente-ficticio', name: 'Harina de prueba', usedQuantity: 200, usedUnit: 'g', purchaseQuantity: 1,
      purchaseUnit: 'kg', purchasePrice: 10000, source: 'Comprobante ficticio' }], components: [], packaging: 200,
    laborMinutes: 60, laborHourly: 1000, other: 100, overhead: 0, overheadMethod: '', notes: '', reviewed: true, history: [], ...overrides };
}

function withConfirmedOrder(overrides: Partial<Order> = {}) {
  let state = createEmptyState();
  state = run(state, { type: 'save', collection: 'accounts', record: account() as unknown as never });
  state = run(state, { type: 'save', collection: 'orders', record: order(overrides) as unknown as never });
  return run(state, { type: 'confirmOrder', id: 'pedido-ficticio', acceptedAt: at, acceptedChannel: 'WhatsApp', capacityChecked: true });
}

describe('State, money and accepted agreements', () => {
  it('creates a real empty state without fictitious customers, sales or balances', () => {
    const state = validateState(createEmptyState());
    expect(state.clients).toHaveLength(0);
    expect(state.money).toHaveLength(0);
    expect(state.sales).toHaveLength(0);
    expect(state.orders).toHaveLength(0);
    expect(state.schemaVersion).toBe(1);
  });

  it('validates the complete demonstration state', () => {
    expect(() => validateState(createDemoState())).not.toThrow();
  });

  it('records a brief initial inquiry without inventing a sale or customer', () => {
    const state = run(createEmptyState(), { type: 'save', collection: 'inquiries', record: inquiry() as unknown as never });
    expect(state.inquiries).toHaveLength(1);
    expect(state.inquiries[0].status).toBe('Por responder');
    expect(state.clients).toHaveLength(0);
    expect(state.sales).toHaveLength(0);
    expect(state.money).toHaveLength(0);
  });

  it('keeps acquisition origin distinct from the current conversation channel', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'clients', record: client() as unknown as never });
    state = run(state, { type: 'save', collection: 'inquiries', record: inquiry({ clientId: 'cliente-ficticio' }) as unknown as never });
    expect(state.clients[0].origin).toBe('Feria');
    expect(state.inquiries[0].channel).toBe('WhatsApp');
  });

  it('does not mutate the input state when applying a command', () => {
    const original = createEmptyState();
    const snapshot = structuredClone(original);
    run(original, { type: 'save', collection: 'inquiries', record: inquiry() as unknown as never });
    expect(original).toEqual(snapshot);
  });

  it('rejects a command based on an obsolete state revision', () => {
    const state = createEmptyState();
    expect(() => applyCommand(state, { id: crypto.randomUUID(), actor: 'ana-ficticia', at, expectedStateRevision: state.revision + 1,
      command: { type: 'save', collection: 'inquiries', record: inquiry() as unknown as never } })).toThrow();
  });

  it('does not confirm a missing price as zero', () => {
    const value = order();
    value.lines[0].unitPrice = null;
    value.lines[0].priceKind = 'Consultar';
    let state = run(createEmptyState(), { type: 'save', collection: 'orders', record: value as unknown as never });
    expect(() => run(state, { type: 'confirmOrder', id: value.id, acceptedAt: at, acceptedChannel: 'WhatsApp', capacityChecked: true })).toThrow();
  });

  it('requires a recorded capacity review before confirming', () => {
    const state = run(createEmptyState(), { type: 'save', collection: 'orders', record: order() as unknown as never });
    expect(() => run(state, { type: 'confirmOrder', id: 'pedido-ficticio', acceptedAt: at, acceptedChannel: 'WhatsApp', capacityChecked: false })).toThrow();
  });

  it('prices two boxes by box and checks the 24-unit filling distribution', () => {
    const value = order();
    value.lines[0] = { ...value.lines[0], quantity: 2, unit: 'caja', unitsPerPack: 12, unitPrice: 12000,
      distribution: [{ variant: 'Manjar', quantity: 12 }, { variant: 'Lúcuma', quantity: 12 }] };
    const state = withConfirmedOrder(value);
    expect(state.orders[0].total).toBe(24000);
    expect(state.orders[0].lines[0].distribution.reduce((sum, part) => sum + part.quantity, 0)).toBe(24);
  });

  it('rejects a box distribution whose fillings do not match its quantity', () => {
    const value = order();
    value.lines[0] = { ...value.lines[0], quantity: 2, unit: 'caja', unitsPerPack: 12, unitPrice: 12000,
      distribution: [{ variant: 'Manjar', quantity: 23 }] };
    expect(() => withConfirmedOrder(value)).toThrow();
  });

  it('does not silently sell an unapproved fraction of a hundred-unit tariff', () => {
    const value = order();
    value.lines[0] = { ...value.lines[0], quantity: 1, unit: 'unidad', baseQuantity: 100, unitPrice: 11500, priceKind: 'Publicado por confirmar' };
    value.total = orderTotal(value);
    expect(() => withConfirmedOrder(value)).toThrow();
  });

  it('does not confirm catering with unresolved scope', () => {
    const value = order({ modality: 'Catering', attendees: 24, duration: '2 horas' });
    value.scope = [{ name: 'Menaje', status: 'Por confirmar', detail: '', amount: null, responsible: 'Ana' }];
    expect(() => withConfirmedOrder(value)).toThrow();
  });

  it('records an advance once without recognizing a future delivery as a sale', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    expect(state.money).toHaveLength(1);
    expect(state.sales).toHaveLength(0);
    expect(orderBalance(state, state.orders[0])).toBe(12000);
    const summary = financialSummary(state, '2026-09-01', '2026-09-30');
    expect(summary.receipts).toBe(12000);
    expect(summary.sales).toBe(0);
    expect(summary.advances).toBe(12000);
  });

  it('recognizes delivery once while preserving the original advance', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    state = run(state, { type: 'deliverOrder', id: 'pedido-ficticio', date: '2026-10-03' });
    expect(state.sales).toHaveLength(1);
    expect(state.sales[0].amount).toBe(24000);
    expect(state.money).toHaveLength(1);
    const saved = state;
    try { state = run(state, { type: 'deliverOrder', id: 'pedido-ficticio', date: '2026-10-03' }); } catch { state = saved; }
    expect(state.sales).toHaveLength(1);
    expect(state.money).toHaveLength(1);
  });

  it('keeps a September advance visible at a September cutoff after October delivery', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    state = run(state, { type: 'deliverOrder', id: 'pedido-ficticio', date: '2026-10-03' });
    expect(financialSummary(state, '2026-09-01', '2026-09-30').advances).toBe(12000);
    expect(financialSummary(state, '2026-09-01', '2026-09-30').sales).toBe(0);
  });

  it('does not duplicate a money command on double touch or retry', () => {
    const initial = withConfirmedOrder();
    const envelope = { id: 'peticion-ficticia-unica', actor: 'ana-ficticia', at, expectedStateRevision: initial.revision,
      command: { type: 'recordMoney', record: movement({ requestId: 'cobro-ficticio-unico' }) } as Command };
    const first = applyCommand(initial, envelope);
    const second = applyCommand(first, envelope);
    expect(second.money).toHaveLength(1);
    expect(second.revision).toBe(first.revision);
    expect(accountBalance(second, second.accounts[0])).toBe(12000);
  });

  it('retains the cancellation credit until a matching refund clears it', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    state = run(state, { type: 'cancelOrder', id: 'pedido-ficticio', reason: 'Cancelación ficticia', charge: 0 });
    expect(orderBalance(state, state.orders[0])).toBe(-12000);
    expect(Math.max(0, orderBalance(state, state.orders[0]))).toBe(0);
    state = run(state, { type: 'recordMoney', record: movement({ kind: 'Devolución al cliente', direction: 'Salida' }) });
    expect(orderBalance(state, state.orders[0])).toBe(0);
    expect(state.money).toHaveLength(2);
    expect(accountBalance(state, state.accounts[0])).toBe(0);
  });

  it('keeps purchase amount separate from a partial supplier payment', () => {
    let state = createEmptyState();
    state = run(state, { type: 'save', collection: 'accounts', record: account({ opening: 10000 }) as unknown as never });
    state = run(state, { type: 'save', collection: 'purchases', record: purchase() as unknown as never });
    state = run(state, { type: 'recordMoney', record: movement({ kind: 'Pago', direction: 'Salida', amount: 4000,
      allocations: [{ entityId: 'compra-ficticia', amount: 4000 }] }) });
    expect(state.purchases[0].amount).toBe(10000);
    expect(purchaseBalance(state, state.purchases[0])).toBe(6000);
    expect(financialSummary(state, '2026-09-01', '2026-09-30').payments).toBe(4000);
  });

  it('allocates one shared purchase across two orders without creating a second expense', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'orders', record: order() as unknown as never });
    state = run(state, { type: 'save', collection: 'orders', record: order({ id: 'pedido-ficticio-2', code: 'P-PRUEBA-2' }) as unknown as never });
    state = run(state, { type: 'save', collection: 'purchases', record: purchase({ orderIds: ['pedido-ficticio', 'pedido-ficticio-2'],
      allocations: [{ orderId: 'pedido-ficticio', amount: 4000, method: 'Reparto revisado' }, { orderId: 'pedido-ficticio-2', amount: 6000, method: 'Reparto revisado' }] }) as unknown as never });
    expect(state.purchases).toHaveLength(1);
    expect(state.purchases[0].allocations.reduce((sum, allocation) => sum + allocation.amount, 0)).toBe(10000);
    const invalid = purchase({ id: 'compra-excedida', allocations: [{ orderId: 'pedido-ficticio', amount: 10001, method: 'Error de prueba' }] });
    expect(() => run(state, { type: 'save', collection: 'purchases', record: invalid as unknown as never })).toThrow();
  });

  it('moves a transfer between two accounts without recording operating income or sales', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'accounts', record: account({ opening: 20000 }) as unknown as never });
    state = run(state, { type: 'save', collection: 'accounts', record: account({ id: 'cuenta-destino', name: 'Banco de prueba' }) as unknown as never });
    state = run(state, { type: 'recordMoney', record: movement({ kind: 'Transferencia', amount: 10000, toAccountId: 'cuenta-destino', allocations: [], direction: 'Salida' }) });
    expect(accountBalance(state, state.accounts.find(value => value.id === 'cuenta-ficticia')!)).toBe(10000);
    expect(accountBalance(state, state.accounts.find(value => value.id === 'cuenta-destino')!)).toBe(10000);
    expect(financialSummary(state, '2026-09-01', '2026-09-30').net).toBe(0);
    expect(state.sales).toHaveLength(0);
  });

  it('leaves unknown opening balances unknown rather than inventing zero', () => {
    const state = run(createEmptyState(), { type: 'save', collection: 'accounts', record: account({ opening: null, source: '' }) as unknown as never });
    expect(accountBalance(state, state.accounts[0])).toBeNull();
  });

  it('preserves an accepted order after the master product price is changed', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'products', record: product() as unknown as never });
    const agreed = order();
    agreed.lines[0] = { ...agreed.lines[0], referenceId: 'producto-ficticio', referenceType: 'product', sourceVersion: state.products.find(value => value.id === 'producto-ficticio')!.revision };
    state = run(state, { type: 'save', collection: 'orders', record: agreed as unknown as never });
    state = run(state, { type: 'confirmOrder', id: 'pedido-ficticio', acceptedAt: at, acceptedChannel: 'WhatsApp', capacityChecked: true });
    const before = structuredClone(state.orders[0]);
    const master = state.products.find(value => value.id === 'producto-ficticio')!;
    state = run(state, { type: 'save', collection: 'products', record: { ...master, price: 1500 } as unknown as never, expectedRevision: master.revision, reason: 'Nueva tarifa ficticia revisada' });
    expect(state.products.find(value => value.id === 'producto-ficticio')!.price).toBe(1500);
    expect(state.orders[0]).toEqual(before);
  });

  it('allows an anonymous delivered sale and excludes it from unique-customer counts', () => {
    let state = withConfirmedOrder({ clientId: null, contactName: 'Venta anónima en feria' });
    state = run(state, { type: 'deliverOrder', id: 'pedido-ficticio', date });
    expect(state.sales).toHaveLength(1);
    expect(state.sales[0].clientId).toBeNull();
    expect(commercialSummary(state, '2026-09-01', '2026-09-30').clients).toBe(0);
  });

  it('keeps the client relationship while different orders retain different needs', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'clients', record: client() as unknown as never });
    state = run(state, { type: 'save', collection: 'orders', record: order({ clientId: 'cliente-ficticio', need: 'Consumo y recompra' }) as unknown as never });
    state = run(state, { type: 'save', collection: 'orders', record: order({ id: 'pedido-regalo', code: 'P-REGALO', clientId: 'cliente-ficticio', need: 'Regalo' }) as unknown as never });
    expect(state.clients).toHaveLength(1);
    expect(new Set(state.orders.map(value => value.need)).size).toBe(2);
  });

  it('does not turn an inquiry from a previous buyer into a repeat sale', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'clients', record: client() as unknown as never });
    state = run(state, { type: 'save', collection: 'inquiries', record: inquiry({ clientId: 'cliente-ficticio', need: 'Consumo y recompra' }) as unknown as never });
    expect(commercialSummary(state, '2026-09-01', '2026-09-30').previous).toBe(0);
    expect(state.sales).toHaveLength(0);
  });

  it('opening a WhatsApp URL does not mutate inquiry response or purchase state', () => {
    const state = run(createEmptyState(), { type: 'save', collection: 'inquiries', record: inquiry() as unknown as never });
    const before = structuredClone(state);
    expect(whatsapp('999123456')).toBe('https://wa.me/51999123456');
    expect(state).toEqual(before);
    expect(state.inquiries[0].respondedAt).toBeNull();
  });

  it('counts six inquiry conversions once even if one inquiry produces two orders', () => {
    let state = createEmptyState();
    for (let index = 0; index < 6; index++) {
      state = run(state, { type: 'save', collection: 'inquiries', record: inquiry({ id: `consulta-${index}` }) as unknown as never });
    }
    state = run(state, { type: 'save', collection: 'orders', record: order({ inquiryId: 'consulta-0' }) as unknown as never });
    state = run(state, { type: 'confirmOrder', id: 'pedido-ficticio', acceptedAt: at, acceptedChannel: 'WhatsApp', capacityChecked: true });
    state = run(state, { type: 'save', collection: 'orders', record: order({ id: 'pedido-2', code: 'P-2', inquiryId: 'consulta-0' }) as unknown as never });
    state = run(state, { type: 'confirmOrder', id: 'pedido-2', acceptedAt: at, acceptedChannel: 'WhatsApp', capacityChecked: true });
    const summary = commercialSummary(state, '2026-09-01', '2026-09-30');
    expect(summary.inquiries).toBe(6);
    expect(summary.confirmed).toBe(1);
    expect(state.orders).toHaveLength(2);
  });

  it('keeps unrecorded costs unknown and reports limited margin coverage', () => {
    const partial = sheet({ packaging: null, reviewed: false });
    const costs = costTotal(createEmptyState(), partial);
    expect(costs.complete).toBe(false);
    expect(costs.total).toBeNull();
    expect(costs.unit).toBeNull();
    let state = withConfirmedOrder();
    state = run(state, { type: 'deliverOrder', id: 'pedido-ficticio', date });
    const summary = financialSummary(state, '2026-09-01', '2026-09-30');
    expect(summary.deliveredCount).toBe(1);
    expect(summary.reviewedCount).toBe(0);
  });

  it('converts compatible units and includes preparation work in batch cost', () => {
    expect(convertQuantity(200, 'g', 'kg')).toBe(0.2);
    expect(convertQuantity(1, 'L', 'ml')).toBe(1000);
    expect(convertQuantity(1, 'docena', 'unidad')).toBe(12);
    const result = costTotal(createEmptyState(), sheet());
    expect(result).toMatchObject({ total: 3300, unit: 1650, complete: true });
    expect(() => convertQuantity(1, 'g', 'ml')).toThrow();
  });

  it('rejects circular costs rather than presenting a fabricated margin', () => {
    const first = sheet({ id: 'costo-a', ingredients: [], components: [{ referenceId: 'producto-b', quantity: 1, costSheetId: 'costo-b' }] });
    const second = sheet({ id: 'costo-b', ingredients: [], components: [{ referenceId: 'producto-a', quantity: 1, costSheetId: 'costo-a' }] });
    const state = createEmptyState();
    state.costs = [first, second];
    expect(costTotal(state, first).complete).toBe(false);
    expect(costTotal(state, first).total).toBeNull();
  });

  it('keeps historical response deadlines when attention hours change', () => {
    let state = createEmptyState();
    state.settings = { ...state.settings, responseHours: 2, workStart: 9, workEnd: 18, workDays: [1, 2, 3, 4, 5] };
    const deadline = responseDeadline(state, at);
    state = run(state, { type: 'save', collection: 'inquiries', record: inquiry({ responseDue: deadline, ruleVersion: state.settings.ruleVersion }) as unknown as never });
    const saved = state.inquiries[0].responseDue;
    state = run(state, { type: 'settings', settings: { ...state.settings, responseHours: 4, ruleVersion: state.settings.ruleVersion + 1 } });
    expect(state.inquiries[0].responseDue).toBe(saved);
  });

  it('blocks promotional follow-up without consent but permits necessary order attention', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'clients', record: client({ consent: 'No autorizado' }) as unknown as never });
    expect(() => run(state, { type: 'save', collection: 'tasks', record: task({ purpose: 'Novedades/promoción' }) as unknown as never })).toThrow();
    state = run(state, { type: 'save', collection: 'tasks', record: task() as unknown as never });
    expect(state.tasks).toHaveLength(1);
  });

  it('allows a customer to withdraw promotional consent and cancels pending promotions', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'clients', record: client({ consent: 'Autorizado', consentEvidence: 'Autorización ficticia', consentAt: date }) as unknown as never });
    state = run(state, { type: 'save', collection: 'tasks', record: task({ purpose: 'Novedades/promoción' }) as unknown as never });
    const previous = state.clients[0];
    state = run(state, { type: 'save', collection: 'clients', record: { ...previous, consent: 'No autorizado', consentEvidence: '', consentAt: '' } as unknown as never, expectedRevision: previous.revision });
    expect(state.clients[0].consent).toBe('No autorizado');
    expect(state.tasks[0].status).toBe('Cancelada');
  });

  it('requires renewed acceptance after changing a confirmed order and preserves the prior agreement', () => {
    let state = withConfirmedOrder();
    const before = structuredClone(state.orders[0]);
    const changed = { ...before, deliveryDate: '2026-10-04', lines: before.lines.map(line => ({ ...line, unitPrice: 1200 })) };
    state = run(state, { type: 'save', collection: 'orders', record: changed as unknown as never, expectedRevision: before.revision, reason: 'Contenido y fecha ficticios revisados' });
    expect(state.orders[0].status).toBe('Por confirmar');
    expect(state.orders[0].acceptedAt).toBeNull();
    expect(state.orders[0].capacityCheckedAt).toBeNull();
    expect(state.orders[0].total).toBe(28800);
    expect(state.orders[0].versions[0].total).toBe(24000);
    expect(state.orders[0].versions[0].deliveryDate).toBe('2026-10-03');
  });

  it('rejects an imported receipt with an allocation to a nonexistent order', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    const invalid = structuredClone(state);
    invalid.money[0].allocations[0].entityId = 'pedido-inexistente';
    expect(() => validateState(invalid)).toThrow();
  });

  it('does not permit negative quantities in a filling distribution even if its sum matches', () => {
    const value = order();
    value.lines[0].distribution = [{ variant: 'Manjar', quantity: -1 }, { variant: 'Lúcuma', quantity: 25 }];
    expect(() => withConfirmedOrder(value)).toThrow();
  });

  it('assigns an initially unknown payment account without duplicating the receipt', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement({ accountId: null }) });
    expect(accountBalance(state, state.accounts[0])).toBe(0);
    const receipt = state.money[0];
    state = run(state, { type: 'assignAccount', id: receipt.id, accountId: 'cuenta-ficticia' });
    expect(state.money).toHaveLength(1);
    expect(accountBalance(state, state.accounts[0])).toBe(12000);
    expect(orderBalance(state, state.orders[0])).toBe(12000);
  });

  it('records supplier refunds independently of customer sales and receipts', () => {
    let state = run(createEmptyState(), { type: 'save', collection: 'accounts', record: account({ opening: 10000 }) as unknown as never });
    state = run(state, { type: 'save', collection: 'purchases', record: purchase() as unknown as never });
    state = run(state, { type: 'recordMoney', record: movement({ kind: 'Pago', direction: 'Salida', amount: 10000, allocations: [{ entityId: 'compra-ficticia', amount: 10000 }] }) });
    state = run(state, { type: 'purchaseAdjustment', id: 'compra-ficticia', amount: -2000, date, reason: 'Devolución ficticia de insumos', cancel: false });
    state = run(state, { type: 'recordMoney', record: movement({ kind: 'Devolución de proveedor', direction: 'Entrada', amount: 2000, allocations: [{ entityId: 'compra-ficticia', amount: 2000 }] }) });
    const summary = financialSummary(state, '2026-09-01', '2026-09-30');
    expect(summary.providerRefunds).toBe(2000);
    expect(summary.receipts).toBe(0);
    expect(summary.sales).toBe(0);
    expect(purchaseBalance(state, state.purchases[0])).toBe(0);
  });

  it('records a post-delivery discount as an adjustment rather than a new sale or receipt', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    state = run(state, { type: 'deliverOrder', id: 'pedido-ficticio', date });
    state = run(state, { type: 'adjustOrder', id: 'pedido-ficticio', amount: -2000, date, reason: 'Descuento ficticio acordado' });
    expect(state.sales).toHaveLength(1);
    expect(state.sales[0].amount).toBe(24000);
    expect(state.sales[0].adjustments[0].amount).toBe(-2000);
    expect(state.money).toHaveLength(1);
    expect(orderBalance(state, state.orders[0])).toBe(10000);
    expect(financialSummary(state, '2026-09-01', '2026-09-30').sales).toBe(22000);
  });

  it('corrects a money error with a recorded reversal instead of erasing its history', () => {
    let state = withConfirmedOrder();
    state = run(state, { type: 'recordMoney', record: movement() });
    const receiptId = state.money[0].id;
    state = run(state, { type: 'reverseMoney', id: receiptId, date, reason: 'Importe ficticio incorrecto' });
    expect(state.money).toHaveLength(2);
    expect(state.money.find(value => value.id === receiptId)?.reversedBy).toBeTruthy();
    expect(state.money.some(value => value.reversalOf === receiptId)).toBe(true);
    expect(orderBalance(state, state.orders[0])).toBe(24000);
    expect(accountBalance(state, state.accounts[0])).toBe(0);
  });

  it('rejects fractional cents and negative new receipts', () => {
    const state = withConfirmedOrder();
    expect(() => run(state, { type: 'recordMoney', record: movement({ amount: 1.25 }) })).toThrow();
    expect(() => run(state, { type: 'recordMoney', record: movement({ amount: -12000 }) })).toThrow();
    expect(cents('S/ 120,25')).toBe(12025);
    expect(() => cents('120.255')).toThrow();
  });

  it('restores a verified snapshot through a new audited command', () => {
    const snapshot = run(createEmptyState(), { type: 'save', collection: 'clients', record: client() as unknown as never });
    let state = run(snapshot, { type: 'save', collection: 'inquiries', record: inquiry() as unknown as never });
    const currentRevision = state.revision;
    state = run(state, { type: 'restore', state: snapshot, reason: 'Recuperación de ejemplo verificada' });
    expect(state.clients).toHaveLength(1);
    expect(state.inquiries).toHaveLength(0);
    expect(state.revision).toBeGreaterThan(currentRevision);
    expect(state.audit.some(value => value.reason.includes('Recuperación de ejemplo'))).toBe(true);
    expect(() => validateState(state)).not.toThrow();
  });
});

describe('Historical cutoffs and consistent quantities', () => {
  it('preserves old receivables and advance allocations after splitting deliveries', () => {
    let state = withConfirmedOrder();
    state = run(state, {type:'recordMoney',record:movement()});
    const original=state.orders[0];
    const part=(id:string)=>({...structuredClone(original),id,code:id,lines:original.lines.map(l=>({...l,id:id+'-line',quantity:12})),total:12000,versions:[]});
    state=run(state,{type:'splitOrder',id:original.id,parts:[part('entrega-a'),part('entrega-b')],reason:'Entregas acordadas por separado'},crypto.randomUUID(),'2026-10-01T15:00:00Z');
    expect(state.money).toHaveLength(1);
    expect(state.money[0].allocations.map(a=>a.amount)).toEqual([6000,6000]);
    const september=financialSummary(state,'2026-09-01','2026-09-30');
    expect(september.receivable).toBe(12000);
    expect(september.advances).toBe(12000);
    expect(september.credit).toBe(0);
    expect(financialSummary(state,'2026-10-01','2026-10-31').receivable).toBe(12000);
    expect(orderBalance(state,state.orders[0],'2026-09-30')).toBe(12000);
  });

  it('keeps the accepted price at an earlier cutoff after a later commercial edit', () => {
    let state=withConfirmedOrder();
    state=run(state,{type:'recordMoney',record:movement()});
    const revised=structuredClone(state.orders[0]);revised.lines[0].unitPrice=1200;
    state=run(state,{type:'save',collection:'orders',record:revised as unknown as never,expectedRevision:revised.revision,reason:'Nueva cantidad cotizada'},crypto.randomUUID(),'2026-10-01T15:00:00Z');
    expect(orderBalance(state,state.orders[0],'2026-09-30')).toBe(12000);
    expect(orderBalance(state,state.orders[0],'2026-10-31')).toBe(16800);
    expect(state.orders[0].status).toBe('Por confirmar');
  });

  it('does not count a response that happened after the report cutoff', () => {
    const state=createEmptyState();state.inquiries=[inquiry({receivedAt:'2026-09-10T15:00:00Z',responseDue:'2026-10-03T15:00:00Z',respondedAt:'2026-10-01T15:00:00Z'})];
    expect(commercialSummary(state,'2026-09-01','2026-09-30').evaluable).toBe(0);
    expect(commercialSummary(state,'2026-09-01','2026-10-02').ontime).toBe(1);
  });

  it('rejects negative ingredient quantities in an imported or edited cost', () => {
    const state=createEmptyState();const invalid=sheet();invalid.ingredients[0].usedQuantity=-200;
    state.costs=[invalid];expect(()=>validateState(state)).toThrow('cantidad usada');
  });

  it('rejects a delivery before acceptance without creating a sale', () => {
    const state=withConfirmedOrder();
    expect(()=>run(state,{type:'deliverOrder',id:state.orders[0].id,date:'2026-09-28'})).toThrow('preceder');
    expect(state.sales).toHaveLength(0);
  });
});

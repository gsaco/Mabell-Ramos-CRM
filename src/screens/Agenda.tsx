import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, ShoppingBag } from 'lucide-react';
import { useApp } from '../services/store';
import { useDraftState, useSessionDraft } from '../services/drafts';
import {personLabel,  addDays, base, dateLabel, normalize, people, today } from '../domain/helpers';
import { convertQuantity } from '../domain/selectors';
import type { Person, PurchaseNeed, Task } from '../domain/types';
import { Actions, Badge, Button, Card, Empty, ErrorBox, Field, Form, Input, Modal, Notice, PageHeader, Select, Tabs, Textarea } from '../components/ui';

const fail = (error: unknown) => error instanceof Error ? error.message : 'No se pudo guardar. El formulario conserva tus datos.';
const taskKinds: Task['kind'][] = ['Atención', 'Compra', 'Preparación', 'Empaque', 'Entrega', 'Montaje', 'Seguimiento', 'Otra'];
const openTask = (task: Task) => !task.archived && ['Pendiente', 'En curso'].includes(task.status);
const minutesOf = (time: string) => /^\d{2}:\d{2}$/.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;

function newTask(profile: Person, date: string, orderId: string | null = null, clientId: string | null = null): Task {
  return { ...base(), title: '', date, time: '', minutes: null, responsible: profile, collaborator: '', orderId, clientId,
    eventId: null, kind: 'Otra', status: 'Pendiente', resource: '', resourceStatus: 'No aplica', purpose: 'Atender solicitud/pedido', notes: '', result: '' };
}

function newNeed(profile: Person, date: string, orderId: string | null): PurchaseNeed {
  return { ...base(), name: '', quantity: 0, unit: 'unidad', date, responsible: profile, orderIds: orderId ? [orderId] : [],
    supplier: '', purchased: 0, purchaseId: null, notes: '' };
}

export function AgendaScreen() {
  const { state, profile, save, busy } = useApp();
  const [params, setParams] = useSearchParams();
  const [start, setStart] = useState(today());
  const [view, setView] = useState(params.get('tab') === 'compras' ? 'compras' : 'tareas');
  const [responsible, setResponsible] = useState('Todas');
  const [status, setStatus] = useState('Activas');
  const [needStatus, setNeedStatus] = useState('Pendientes');
  const [taskDraft, setTaskDraft, clearTaskDraft] = useSessionDraft<Task | null>('agenda-task', null);
  const [needDraft, setNeedDraft, clearNeedDraft] = useSessionDraft<PurchaseNeed | null>('agenda-need', null);
  const [linkNeed, setLinkNeed, clearLinkDraft] = useSessionDraft<PurchaseNeed | null>('agenda-link', null);
  const [purchaseId, setPurchaseId] = useDraftState('agenda-link', 'purchaseId', '');
  const [purchased, setPurchased] = useDraftState('agenda-link', 'purchased', '');
  const [taskOpen, setTaskOpen] = useState(!!taskDraft);
  const [needOpen, setNeedOpen] = useState(!!needDraft);
  const [linkOpen, setLinkOpen] = useState(!!linkNeed);
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const [error, setError] = useState('');
  const orderId = params.get('order');
  const clientId = params.get('client');
  const end = addDays(start, 13);
  const visibleTo = (owner: Person) => responsible === 'Todas' || owner === responsible;
  const orderContext = state.orders.find(order => order.id === orderId);
  const customerName = (id: string | null) => state.clients.find(client => client.id === id)?.name || '';
  const linkedName = (task: Task) => {
    const order = state.orders.find(order => order.id === task.orderId);
    return order ? `${order.code} · ${order.contactName || customerName(order.clientId) || 'Venta presencial'}` : customerName(task.clientId);
  };
  const canShowPromotion = (task: Task) => task.purpose !== 'Novedades/promoción' || task.status === 'Completada' || task.status === 'Cancelada' || state.clients.find(client => client.id === task.clientId)?.consent === 'Autorizado';
  const selectedTasks = state.tasks.filter(task => !task.archived && visibleTo(task.responsible) && (!orderId || task.orderId === orderId) &&
    (!clientId || task.clientId === clientId) && canShowPromotion(task) &&
    (status === 'Todas' || (status === 'Activas' ? openTask(task) : task.status === status)));
  const periodTasks = selectedTasks.filter(task => task.date >= start && task.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99'));
  const earlierTasks = selectedTasks.filter(task => openTask(task) && task.date && task.date < start)
    .sort((a, b) => a.date.localeCompare(b.date));
  const undatedTasks = selectedTasks.filter(task => !task.date);
  const orders = state.orders.filter(order => !order.archived && !order.isSimulation && ['Confirmado', 'En preparación'].includes(order.status) &&
    visibleTo(order.responsible) && (!orderId || order.id === orderId) && (!clientId || order.clientId === clientId) && order.deliveryDate >= start && order.deliveryDate <= end);
  const needs = state.purchaseNeeds.filter(need => !need.archived && visibleTo(need.responsible) && (!orderId || need.orderIds.includes(orderId)) &&
    need.date <= end && (needStatus === 'Todas' || (needStatus === 'Pendientes' ? need.purchased < need.quantity : need.purchased >= need.quantity)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const overlaps = useMemo(() => {
    const candidates = state.tasks.filter(task => openTask(task) && task.date >= start && task.date <= end && task.minutes !== null && task.minutes > 0 && minutesOf(task.time) !== null &&
      !state.orders.find(order => order.id === task.orderId)?.isSimulation && canShowPromotion(task));
    const visibleIds = new Set(selectedTasks.map(task => task.id));
    const result: { first: Task; second: Task; reason: string }[] = [];
    for (let first = 0; first < candidates.length; first++) for (let second = first + 1; second < candidates.length; second++) {
      const a = candidates[first], b = candidates[second];
      if (a.date !== b.date || (!visibleIds.has(a.id) && !visibleIds.has(b.id))) continue;
      const aStart = minutesOf(a.time)!, bStart = minutesOf(b.time)!;
      if (aStart >= bStart + b.minutes! || bStart >= aStart + a.minutes!) continue;
      const workers = (task: Task) => new Set([task.responsible, ...people.filter(person => normalize(task.collaborator).split(/\W+/).includes(normalize(person)))]);
      const aWorkers = workers(a), bWorkers = workers(b);
      const sharedPeople = [...aWorkers].filter(person => bWorkers.has(person));
      const samePerson = sharedPeople.length > 0;
      const sameResource = a.resource.trim() && b.resource.trim() && normalize(a.resource.trim()) === normalize(b.resource.trim());
      if (samePerson || sameResource) result.push({ first: a, second: b, reason: [samePerson ? `Persona: ${sharedPeople.join(' y ')}` : '', sameResource ? `Recurso: ${a.resource}` : ''].filter(Boolean).join(' · ') });
    }
    return result;
  }, [state, start, end, responsible, status, orderId, clientId]);

  const requestedTask = params.get('task');
  useEffect(() => {
    if (!requestedTask) return;
    const found = state.tasks.find(task => task.id === requestedTask);
    if (found) {
      if (taskDraft && taskDraft.id !== found.id) setError('Tienes otra tarea sin guardar. Termínala o descarta su borrador antes de revisar esta tarea.');
      else { if (!taskDraft) setTaskDraft(structuredClone(found)); setError(''); }
      setTaskOpen(true); setView('tareas');
    }
    else setError('Esta tarea ya no está disponible. Revisa la agenda.');
  }, [requestedTask]);
  useEffect(() => {
    if (focusedDay) document.getElementById(`agenda-${focusedDay}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedDay]);

  const clearTaskParam = () => {
    if (params.has('task')) { const next = new URLSearchParams(params); next.delete('task'); setParams(next, { replace: true }); }
  };
  const closeTask = () => { setTaskOpen(false); setError(''); clearTaskParam(); };
  const editTask = (task: Task, desiredStatus?: Task['status']) => {
    if (taskDraft && taskDraft.id !== task.id) setError('Tienes otra tarea sin guardar. Termínala o descarta su borrador antes de revisar esta tarea.');
    else { setTaskDraft({ ...(taskDraft || structuredClone(task)), ...(desiredStatus ? { status: desiredStatus } : {}) }); setError(''); }
    setTaskOpen(true);
  };
  const addTask = (date = start) => { if (!taskDraft) { const draft = newTask(profile, date, orderContext?.id || null, orderContext?.clientId || clientId); draft.eventId = orderContext?.eventId || null; setTaskDraft(draft); } setTaskOpen(true); setError(''); };
  const addNeed = (need?: PurchaseNeed) => {
    if (needDraft && need && needDraft.id !== need.id) setError('Hay una necesidad de compra sin guardar. Termínala o descarta su borrador antes de editar otra.');
    else { if (!needDraft) setNeedDraft(need ? structuredClone(need) : newNeed(profile, start, orderId)); setError(''); }
    setNeedOpen(true);
  };
  const patchTask = (patch: Partial<Task>) => setTaskDraft(draft => draft ? { ...draft, ...patch } : draft);
  const patchNeed = (patch: Partial<PurchaseNeed>) => setNeedDraft(draft => draft ? { ...draft, ...patch } : draft);

  async function saveTask() {
    if (!taskDraft) return;
    setError('');
    try {
      if (!taskDraft.title.trim() || !taskDraft.date) throw new Error('Escribe qué hay que hacer y en qué fecha.');
      if (taskDraft.minutes !== null && (!Number.isFinite(taskDraft.minutes) || taskDraft.minutes <= 0)) throw new Error('La duración debe ser mayor que cero o quedar por estimar.');
      if (taskDraft.status === 'Completada' && !taskDraft.result.trim()) throw new Error('Resume lo que se hizo antes de completar la tarea.');
      if (taskDraft.purpose === 'Novedades/promoción' && !['Cancelada', 'Completada'].includes(taskDraft.status) && state.clients.find(client => client.id === taskDraft.clientId)?.consent !== 'Autorizado') throw new Error('Este cliente no tiene autorización registrada para novedades o promociones. La atención necesaria de un pedido se registra por separado.');
      await save('tasks', { ...taskDraft, title: taskDraft.title.trim() }, `Tarea ${taskDraft.status.toLowerCase()}: ${taskDraft.title}`);
      clearTaskDraft(null);
      closeTask();
    } catch (error) { setError(fail(error)); }
  }

  async function saveNeed() {
    if (!needDraft) return;
    setError('');
    try {
      if (!needDraft.name.trim() || !needDraft.unit.trim() || !needDraft.date) throw new Error('Completa artículo, unidad y fecha necesaria.');
      if (!Number.isFinite(needDraft.quantity) || needDraft.quantity <= 0) throw new Error('Indica una cantidad mayor que cero.');
      if (needDraft.quantity < needDraft.purchased) throw new Error('La cantidad necesaria no puede ser menor que la cantidad ya vinculada a una compra.');
      await save('purchaseNeeds', { ...needDraft, name: needDraft.name.trim(), unit: needDraft.unit.trim() }, 'Actualizar necesidad de compra');
      clearNeedDraft(null); setNeedOpen(false);
    } catch (error) { setError(fail(error)); }
  }

  function beginLink(need: PurchaseNeed) {
    if (linkNeed && linkNeed.id !== need.id) setError('Tienes un vínculo de compra sin guardar. Termínalo o descártalo antes de revisar otra necesidad.');
    else { if (!linkNeed) { setLinkNeed(need); setPurchaseId(need.purchaseId || ''); setPurchased(need.purchaseId ? String(need.purchased) : ''); } setError(''); }
    setLinkOpen(true);
  }
  function choosePurchase(value: string) {
    setPurchaseId(value);
    const purchase = state.purchases.find(purchase => purchase.id === value);
    if (purchase?.quantity !== null && purchase?.quantity !== undefined && purchase.unit && linkNeed) {
      try { setPurchased(String(Math.min(linkNeed.quantity, convertQuantity(purchase.quantity, purchase.unit, linkNeed.unit)))); }
      catch { setPurchased(''); }
    } else setPurchased('');
  }

  async function linkPurchase() {
    if (!linkNeed) return;
    setError('');
    try {
      const purchase = state.purchases.find(purchase => purchase.id === purchaseId && purchase.status === 'Vigente');
      if (!purchase) throw new Error('Elige una compra real registrada y vigente.');
      const quantity = Number(purchased);
      if (!purchased.trim() || !Number.isFinite(quantity) || quantity <= 0 || quantity > linkNeed.quantity) throw new Error('La cantidad atendida debe estar entre cero y la cantidad necesaria, sin superar esta última.');
      if (purchase.quantity !== null && purchase.unit) {
        let assigned = 0;
        try {
          assigned = state.purchaseNeeds.filter(need => need.id !== linkNeed.id && need.purchaseId === purchase.id)
            .reduce((sum, need) => sum + convertQuantity(need.purchased, need.unit, purchase.unit), 0);
          assigned += convertQuantity(quantity, linkNeed.unit, purchase.unit);
        } catch { throw new Error('Las unidades no se pueden relacionar automáticamente. Revisa la unidad de la compra y de cada necesidad.'); }
        if (assigned > purchase.quantity + 1e-9) throw new Error('Las cantidades vinculadas a esta compra superan su cantidad registrada. Revisa sus otras necesidades antes de guardar.');
      }
      await save('purchaseNeeds', { ...linkNeed, purchased: quantity, purchaseId: purchase.id }, 'Vincular cantidad atendida a compra registrada');
      clearLinkDraft(null); setLinkOpen(false);
    } catch (error) { setError(fail(error)); }
  }

  async function archiveNeed(need: PurchaseNeed) {
    setError('');
    try { await save('purchaseNeeds', { ...need, archived: true }, 'Retirar recordatorio de compra conservando su historial'); }
    catch (error) { setError(fail(error)); }
  }

  const taskRow = (task: Task) => <div className="list-row" key={task.id}>
    <div className="list-main"><strong>{task.title}</strong><p>{task.kind} · {personLabel(task.responsible)}{task.collaborator ? ` · Apoyo: ${task.collaborator}` : ''}</p>
      <small className="muted">{task.date ? dateLabel(task.date) : 'Fecha por programar'}{task.time ? ` · ${task.time}` : ' · Hora por coordinar'} · {task.minutes === null ? 'Duración por estimar' : `${task.minutes} min`}</small>
      {linkedName(task) && <p>{task.orderId ? <Link className="text-link" to={`/pedidos/${task.orderId}`}>{linkedName(task)}</Link> : <Link className="text-link" to={`/clientes/${task.clientId}`}>{linkedName(task)}</Link>}</p>}
      {task.resourceStatus !== 'No aplica' && <p><Badge tone={task.resourceStatus === 'Por confirmar' ? 'warning' : 'success'}>{task.resource || 'Apoyo/recurso'} · {task.resourceStatus}</Badge></p>}
      {task.purpose === 'Novedades/promoción' && <Badge>Novedades/promoción</Badge>}
      {task.result && <p><strong>Resultado:</strong> {task.result}</p>}
    </div>
    <div className="stack"><Badge tone={task.status === 'Completada' ? 'success' : task.status === 'Cancelada' ? 'danger' : task.status === 'En curso' ? 'purple' : 'neutral'}>{task.status}</Badge><div className="inline-actions"><Button variant="secondary" onClick={() => editTask(task)}>Revisar</Button>{openTask(task) && <Button variant="ghost" onClick={() => editTask(task, 'Completada')}>Completar</Button>}</div></div>
  </div>;

  const selectedClient = state.clients.find(client => client.id === taskDraft?.clientId);
  return <div className="stack">
    <PageHeader eyebrow="Etapas, apoyo y recursos" title="Agenda y compras" description="Dos semanas de trabajo. Las coincidencias ayudan a revisar compromisos; la disponibilidad la confirma una persona." actions={<><Button onClick={() => addTask()}><Plus size={18} />Nueva tarea</Button><Button variant="secondary" onClick={() => addNeed()}><ShoppingBag size={18} />Necesidad de compra</Button></>} />
    <Tabs values={[{ id: 'tareas', label: 'Agenda de dos semanas' }, { id: 'compras', label: 'Compras pendientes', count: needs.filter(need => need.purchased < need.quantity).length }]} value={view} onChange={setView} />
    <div className="toolbar"><Button variant="ghost" aria-label="Ver las dos semanas anteriores" onClick={() => setStart(addDays(start, -14))}><ChevronLeft size={18} /></Button><Field label="Desde"><Input type="date" value={start} onChange={event => setStart(event.target.value || today())} /></Field><span>hasta {dateLabel(end)}</span><Button variant="ghost" aria-label="Ver las dos semanas siguientes" onClick={() => setStart(addDays(start, 14))}><ChevronRight size={18} /></Button><Button variant="secondary" onClick={() => setStart(today())}>Volver a hoy</Button><Field label="Responsable"><Select value={responsible} onChange={event => setResponsible(event.target.value)}><option>Todas</option>{people.map(person => <option key={person} value={person}>{personLabel(person)}</option>)}</Select></Field><Button variant="ghost" onClick={() => setResponsible(responsible === profile ? 'Todas' : profile)}>{responsible === profile ? 'Ver todo' : 'Mi trabajo'}</Button>
      {view === 'tareas' ? <Field label="Estado"><Select value={status} onChange={event => setStatus(event.target.value)}>{['Activas', 'Todas', 'Pendiente', 'En curso', 'Completada', 'Cancelada'].map(value => <option key={value}>{value}</option>)}</Select></Field> : <Field label="Necesidades"><Select value={needStatus} onChange={event => setNeedStatus(event.target.value)}><option>Pendientes</option><option>Atendidas</option><option>Todas</option></Select></Field>}
    </div>
    {(orderId || clientId) && <Notice>Filtrando {orderContext ? `el pedido ${orderContext.code}` : clientId ? customerName(clientId) || 'el cliente seleccionado' : 'el pedido seleccionado'}. <Button variant="ghost" onClick={() => { const next = new URLSearchParams(params); next.delete('order'); next.delete('client'); setParams(next); }}>Ver todo el negocio</Button></Notice>}
    {!taskOpen && !needOpen && !linkOpen && <ErrorBox error={error} />}
    {taskDraft && !taskOpen && <Notice tone="warning">Hay una tarea en borrador en esta sesión; aún no está guardada para la otra persona. <Button variant="ghost" onClick={() => setTaskOpen(true)}>Retomar tarea</Button><Button variant="ghost" onClick={() => clearTaskDraft(null)}>Descartar borrador</Button></Notice>}
    {needDraft && !needOpen && <Notice tone="warning">Hay una necesidad de compra en borrador; aún no está guardada. <Button variant="ghost" onClick={() => setNeedOpen(true)}>Retomar necesidad</Button><Button variant="ghost" onClick={() => clearNeedDraft(null)}>Descartar borrador</Button></Notice>}
    {linkNeed && !linkOpen && <Notice tone="warning">El vínculo de una compra sigue en borrador. <Button variant="ghost" onClick={() => setLinkOpen(true)}>Retomar vínculo</Button><Button variant="ghost" onClick={() => clearLinkDraft(null)}>Descartar borrador</Button></Notice>}

    {view === 'tareas' && <>
      <Notice>Programa compra, preparación, empaque, entrega, montaje y atención según cada encargo. Una duración sin registrar no equivale a cero ni una fecha sin tareas confirma capacidad libre.</Notice>
      <Card title="Los próximos 14 días" subtitle="Tareas y entregas registradas; toca una fecha para ver su detalle">
        <div className="agenda-strip" aria-label="Resumen de dos semanas">{Array.from({ length: 14 }, (_, index) => addDays(start, index)).map(day => {
          const dayTasks = periodTasks.filter(task => task.date === day).length, dayOrders = orders.filter(order => order.deliveryDate === day).length;
          return <button type="button" className={`agenda-day ${day === focusedDay ? 'active' : ''}`} aria-pressed={day === focusedDay} key={day} onClick={() => setFocusedDay(day)}>
            <strong>{new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', timeZone: 'America/Lima' }).format(new Date(`${day}T12:00:00-05:00`))}</strong>
            <span>{dayTasks} {dayTasks === 1 ? 'tarea' : 'tareas'}</span><small>{dayOrders} {dayOrders === 1 ? 'entrega' : 'entregas'}</small>
            {!dayTasks && !dayOrders && <small>Sin registros</small>}
          </button>;
        })}</div>
      </Card>
      {overlaps.length > 0 && <Card title="Coincidencias para revisar" subtitle="Se comparan horas y duraciones de tareas activas que comparten responsable o recurso; no se rechazan pedidos automáticamente">
        {overlaps.slice(0, 8).map((overlap, index) => <div className="list-row" key={`${overlap.first.id}-${overlap.second.id}`}><div className="list-main"><strong>{dateLabel(overlap.first.date)} · {overlap.reason}</strong><p>{overlap.first.time} {overlap.first.title} / {overlap.second.time} {overlap.second.title}</p><small>Consulta cómo compartir el trabajo, confirmar apoyo o cambiar la hora.</small></div><Button variant="secondary" onClick={() => editTask(overlap.first)}>Revisar tarea</Button></div>)}{overlaps.length > 8 && <p className="muted">Hay {overlaps.length} coincidencias. Revisa los días y responsables para ver las demás.</p>}
      </Card>}
      {earlierTasks.length > 0 && <Card title="Pendientes de fechas anteriores" subtitle="Revisa si se realizaron, necesitan reprogramarse o ya no corresponden">{earlierTasks.slice(0, 8).map(taskRow)}{earlierTasks.length > 8 && <p>Hay {earlierTasks.length} tareas anteriores; cambia la fecha para revisar las demás.</p>}</Card>}
      {undatedTasks.length > 0 && <Card title="Tareas sin fecha">{undatedTasks.map(taskRow)}</Card>}
      {Array.from({ length: 14 }, (_, index) => addDays(start, index)).filter(day => day === focusedDay || periodTasks.some(task => task.date === day) || orders.some(order => order.deliveryDate === day)).map(day => <Card key={day} title={dateLabel(day)} action={<Button variant="ghost" onClick={() => addTask(day)}><Plus size={16} />Tarea</Button>}>
        <div id={`agenda-${day}`} />
        {!periodTasks.some(task => task.date === day) && !orders.some(order => order.deliveryDate === day) && <p className="muted">No hay compromisos registrados para esta fecha; revisa la disponibilidad antes de acordar un nuevo encargo.</p>}
        {orders.filter(order => order.deliveryDate === day).map(order => <div className="list-row" key={order.id}><div className="list-main"><Link className="text-link" to={`/pedidos/${order.id}`}><CalendarDays size={16} />{order.code} · {order.contactName || customerName(order.clientId) || 'Entrega de productos'}</Link><p>{order.modality} · {order.deliveryTime || 'Hora por coordinar'} · {personLabel(order.responsible)}</p>{!state.tasks.some(task => task.orderId === order.id && !task.archived && task.status !== 'Cancelada') && <Badge tone="warning">Etapas todavía por programar</Badge>}</div><Link className="text-link" to={`/pedidos/${order.id}`}>Ver acuerdo</Link></div>)}
        {periodTasks.filter(task => task.date === day).map(taskRow)}
      </Card>)}
      {!periodTasks.length && !orders.length && <Empty title="No hay tareas ni entregas registradas en estas dos semanas" text="Añade las etapas de un pedido o cambia las fechas para revisar otros compromisos." action={<Button variant="secondary" onClick={() => addTask()}>Programar una tarea</Button>} />}
    </>}

    {view === 'compras' && <>
      <Notice>Una necesidad de compra es un recordatorio. Registra la compra real y vincula su cantidad; el pago se registra cuando salga el dinero.</Notice>
      {needs.map(need => <Card key={need.id}><div className="list-row"><div className="list-main"><strong>{need.name}</strong><p>{need.quantity} {need.unit} · Necesario: {dateLabel(need.date)} · {personLabel(need.responsible)}</p><p><strong>Atendido:</strong> {need.purchased} {need.unit} · <strong>Por completar:</strong> {Math.max(0, need.quantity - need.purchased)} {need.unit}</p>{need.supplier && <small>Proveedor o lugar: {need.supplier}</small>}{need.orderIds.length > 0 && <p>{need.orderIds.map((id, index) => <span key={id}>{index > 0 && ' · '}<Link className="text-link" to={`/pedidos/${id}`}>{state.orders.find(order => order.id === id)?.code || 'Pedido vinculado'}</Link></span>)}</p>}{need.purchaseId && <p><Link className="text-link" to="/dinero?tab=compras">Compra: {state.purchases.find(purchase => purchase.id === need.purchaseId)?.description || 'Revisar vínculo'}</Link></p>}{need.notes && <p className="muted">{need.notes}</p>}</div><Badge tone={need.purchased >= need.quantity ? 'success' : 'warning'}>{need.purchased >= need.quantity ? 'Atendida' : need.purchased > 0 ? 'Atendida en parte' : 'Pendiente'}</Badge></div><div className="inline-actions"><Link className="btn btn-secondary" to={`/dinero?action=compra&need=${encodeURIComponent(need.id)}`}>Registrar compra</Link><Button variant="secondary" onClick={() => beginLink(need)}>Vincular compra registrada</Button><Button variant="ghost" onClick={() => addNeed(need)}>Editar necesidad</Button><Button variant="ghost" disabled={busy} onClick={() => void archiveNeed(need)}>Retirar recordatorio</Button></div></Card>)}
      {!needs.length && <Empty title="No hay necesidades de compra con estos filtros" text="Puedes añadir un insumo o empaque que necesite un pedido, con su fecha y cantidad." action={<Button variant="secondary" onClick={() => addNeed()}>Añadir necesidad</Button>} />}
    </>}

    <Modal open={taskOpen && !!taskDraft} onClose={closeTask} title={taskDraft?.revision ? 'Revisar tarea' : 'Nueva tarea'} description="Una etapa concreta, una responsable principal y recursos por confirmar cuando corresponda." wide>
      {taskDraft && <Form onSubmit={saveTask}><ErrorBox error={error} /><div className="form-grid"><div className="span-2"><Field label="Qué hacer"><Input required value={taskDraft.title} placeholder="Por ejemplo: preparar la masa de los alfajores" onChange={event => patchTask({ title: event.target.value })} /></Field></div><Field label="Etapa"><Select value={taskDraft.kind} onChange={event => patchTask({ kind: event.target.value as Task['kind'] })}>{taskKinds.map(kind => <option key={kind}>{kind}</option>)}</Select></Field><Field label="Responsable principal"><Select value={taskDraft.responsible} onChange={event => patchTask({ responsible: event.target.value as Person })}>{people.map(person => <option key={person} value={person}>{personLabel(person)}</option>)}</Select></Field><Field label="Fecha"><Input type="date" required value={taskDraft.date} onChange={event => patchTask({ date: event.target.value })} /></Field><Field label="Hora, si está coordinada"><Input type="time" value={taskDraft.time} onChange={event => patchTask({ time: event.target.value })} /></Field><Field label="Duración estimada, en minutos" hint="Deja vacío si todavía debe medirse."><Input type="number" min="1" step="1" value={taskDraft.minutes ?? ''} onChange={event => patchTask({ minutes: event.target.value === '' ? null : Number(event.target.value) })} /></Field><Field label="Estado"><Select value={taskDraft.status} onChange={event => patchTask({ status: event.target.value as Task['status'] })}><option>Pendiente</option><option>En curso</option><option>Completada</option><option>Cancelada</option></Select></Field><Field label="Pedido relacionado"><Select value={taskDraft.orderId || ''} onChange={event => { const order = state.orders.find(order => order.id === event.target.value); patchTask({ orderId: order?.id || null, clientId: order?.clientId || taskDraft.clientId, eventId: order?.eventId || null }); }}><option value="">Sin pedido específico</option>{state.orders.filter(order => !order.archived).map(order => <option key={order.id} value={order.id}>{order.code} · {order.contactName || 'Venta presencial'}</option>)}</Select></Field><Field label="Cliente, si corresponde"><Select value={taskDraft.clientId || ''} onChange={event => patchTask({ clientId: event.target.value || null })}><option value="">Sin cliente específico</option>{state.clients.filter(client => !client.archived && !client.mergedInto).map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></Field><Field label="Apoyo o colaboradora"><Input value={taskDraft.collaborator} onChange={event => patchTask({ collaborator: event.target.value })} placeholder="Sólo si hay apoyo identificado" /></Field><Field label="Equipo, menaje o traslado"><Input value={taskDraft.resource} onChange={event => patchTask({ resource: event.target.value })} placeholder="Recurso necesario" /></Field><Field label="Estado del recurso o apoyo"><Select value={taskDraft.resourceStatus} onChange={event => patchTask({ resourceStatus: event.target.value as Task['resourceStatus'] })}><option>No aplica</option><option>Por confirmar</option><option>Confirmado</option></Select></Field><Field label="Finalidad del contacto"><Select value={taskDraft.purpose} onChange={event => patchTask({ purpose: event.target.value as Task['purpose'] })}><option>Atender solicitud/pedido</option><option>Novedades/promoción</option></Select></Field><div className="span-2"><Field label="Notas y acuerdos"><Textarea value={taskDraft.notes} onChange={event => patchTask({ notes: event.target.value })} /></Field></div>{['Completada', 'Cancelada'].includes(taskDraft.status) && <div className="span-2"><Field label={taskDraft.status === 'Completada' ? 'Qué se hizo y qué sigue' : 'Motivo, si se canceló'}><Textarea required={taskDraft.status === 'Completada'} value={taskDraft.result} onChange={event => patchTask({ result: event.target.value })} /></Field></div>}</div>
      {taskDraft.purpose === 'Novedades/promoción' && <Notice tone={selectedClient?.consent === 'Autorizado' ? 'success' : 'warning'}>{selectedClient?.consent === 'Autorizado' ? `Autorización registrada: ${selectedClient.consentEvidence}` : 'Selecciona un cliente con autorización registrada. No se enviarán mensajes automáticamente.'}</Notice>}
      <Actions><Button type="button" variant="secondary" onClick={closeTask}>Volver; conservar borrador</Button><Button disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar tarea'}</Button></Actions></Form>}
    </Modal>

    <Modal open={needOpen && !!needDraft} onClose={() => { setNeedOpen(false); setError(''); }} title={needDraft?.revision ? 'Revisar necesidad de compra' : 'Necesidad de compra'} wide>
      {needDraft && <Form onSubmit={saveNeed}><ErrorBox error={error} /><div className="form-grid"><Field label="Insumo, empaque o artículo"><Input required value={needDraft.name} onChange={event => patchNeed({ name: event.target.value })} /></Field><Field label="Cantidad necesaria"><Input type="number" min="0.001" step="any" required value={needDraft.quantity || ''} onChange={event => patchNeed({ quantity: Number(event.target.value) })} /></Field><Field label="Unidad"><Input list="need-units" required value={needDraft.unit} onChange={event => patchNeed({ unit: event.target.value })} /><datalist id="need-units">{['unidad', 'kg', 'g', 'L', 'ml', 'caja', 'paquete', 'botella'].map(unit => <option key={unit}>{unit}</option>)}</datalist></Field><Field label="Fecha necesaria"><Input type="date" required value={needDraft.date} onChange={event => patchNeed({ date: event.target.value })} /></Field><Field label="Quién coordina la compra"><Select value={needDraft.responsible} onChange={event => patchNeed({ responsible: event.target.value as Person })}>{people.map(person => <option key={person} value={person}>{personLabel(person)}</option>)}</Select></Field><Field label="Proveedor o lugar, si está definido"><Input value={needDraft.supplier} list="need-suppliers" onChange={event => patchNeed({ supplier: event.target.value })} /><datalist id="need-suppliers">{state.suppliers.filter(supplier => !supplier.archived).map(supplier => <option key={supplier.id}>{supplier.name}</option>)}</datalist></Field></div><section className="form-section"><h3>Pedidos que necesitan esta compra</h3><div className="stack">{state.orders.filter(order => !order.archived && !order.isSimulation && order.status !== 'Cancelado').map(order => <label className="row" key={order.id}><input type="checkbox" checked={needDraft.orderIds.includes(order.id)} onChange={event => patchNeed({ orderIds: event.target.checked ? [...needDraft.orderIds, order.id] : needDraft.orderIds.filter(id => id !== order.id) })} />{order.code} · {order.contactName || 'Venta presencial'} · {dateLabel(order.deliveryDate)}</label>)}{!state.orders.length && <p className="muted">Se puede registrar una necesidad general sin un pedido específico.</p>}</div></section><Field label="Observaciones"><Textarea value={needDraft.notes} onChange={event => patchNeed({ notes: event.target.value })} /></Field>{needDraft.purchased > 0 && <Notice>Ya se vincularon {needDraft.purchased} {needDraft.unit} a una compra. Para revisar esa cantidad utiliza «Vincular compra registrada».</Notice>}<Actions><Button type="button" variant="secondary" onClick={() => setNeedOpen(false)}>Volver; conservar borrador</Button><Button disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar necesidad'}</Button></Actions></Form>}
    </Modal>

    <Modal open={linkOpen && !!linkNeed} onClose={() => { setLinkOpen(false); setError(''); }} title="Vincular una compra registrada" description="La compra y su pago se conservan en Dinero. Aquí confirmas cuánto atendió esta necesidad.">
      {linkNeed && <Form onSubmit={linkPurchase}><ErrorBox error={error} /><p><strong>{linkNeed.name}</strong> · Necesidad: {linkNeed.quantity} {linkNeed.unit}</p><Field label="Compra real registrada"><Select value={purchaseId} required onChange={event => choosePurchase(event.target.value)}><option value="">Selecciona una compra</option>{state.purchases.filter(purchase => !purchase.archived && purchase.status === 'Vigente').map(purchase => <option key={purchase.id} value={purchase.id}>{purchase.description} · {dateLabel(purchase.date)}{purchase.quantity !== null ? ` · ${purchase.quantity} ${purchase.unit}` : ''}</option>)}</Select></Field><Field label={`Cantidad de esta necesidad atendida con esa compra (${linkNeed.unit})`} hint="Revisa la cantidad; no marca la compra como pagada."><Input type="number" min="0.001" max={linkNeed.quantity} step="any" required value={purchased} onChange={event => setPurchased(event.target.value)} /></Field><Notice>Para otra compra parcial, conserva su registro y revisa la cantidad vinculada. El historial conserva los vínculos anteriores; no se inventa un importe ni un pago.</Notice>{!state.purchases.some(purchase => purchase.status === 'Vigente') && <p><Link className="text-link" to={`/dinero?action=compra&need=${encodeURIComponent(linkNeed.id)}`}>Registrar primero la compra</Link></p>}<Actions><Button type="button" variant="secondary" onClick={() => setLinkOpen(false)}>Volver; conservar borrador</Button><Button disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar vínculo y cantidad'}</Button></Actions></Form>}
    </Modal>
  </div>;
}

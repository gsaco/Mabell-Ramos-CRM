import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ShoppingBag, MessageCircle, Wallet, ArrowUpRight, ClipboardList } from 'lucide-react';
import { useApp } from '../services/store';
import { addDays, dateLabel, dateOf, money, safeUrl, today } from '../domain/helpers';
import { orderBalance, purchaseBalance } from '../domain/selectors';
import type { Inquiry, Task } from '../domain/types';
import { Badge, Card, Empty, ExternalLink, Notice, PageHeader, Stat, Tabs } from '../components/ui';

const activeTask = (task: Task) => !task.archived && !['Completada', 'Cancelada'].includes(task.status);

export function HomeScreen() {
  const { state, profile } = useApp();
  const [view, setView] = useState(profile === 'Mabel' ? 'mine' : 'all');
  useEffect(() => { setView(profile === 'Mabel' ? 'mine' : 'all'); }, [profile]);
  const day = today();
  const now = new Date().toISOString();
  const until = addDays(day, 13);
  const mine = (responsible: string) => view === 'all' || responsible === profile;
  const clientName = (id: string | null, fallback = '') => state.clients.find(client => client.id === id)?.name || fallback || 'Contacto por identificar';
  const inquiryPriority = (inquiry: Inquiry) => {
    if (inquiry.waitingClient) return 4;
    if (inquiry.responseDue && inquiry.responseDue < now) return 0;
    if (inquiry.responseDue && dateOf(inquiry.responseDue) === day) return 1;
    if (!inquiry.responseDue) return 2;
    return 3;
  };
  const inquiries = state.inquiries.filter(inquiry => !inquiry.archived && !inquiry.respondedAt &&
    !['No se concretó', 'Duplicada'].includes(inquiry.status) && mine(inquiry.responsible))
    .sort((a, b) => inquiryPriority(a) - inquiryPriority(b) || (a.responseDue || a.receivedAt).localeCompare(b.responseDue || b.receivedAt));
  const tasks = state.tasks.filter(task => activeTask(task) && mine(task.responsible) &&
    (task.purpose !== 'Novedades/promoción' || state.clients.find(client => client.id === task.clientId)?.consent === 'Autorizado'))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.time.localeCompare(b.time));
  const nearTasks = tasks.filter(task => !task.date || task.date <= addDays(day, 2));
  const activeOrders = state.orders.filter(order => !order.archived && !order.isSimulation && order.confirmedAt && mine(order.responsible));
  const receivables = activeOrders.map(order => ({ order, balance: orderBalance(state, order) })).filter(row => row.balance !== 0)
    .sort((a, b) => (a.order.dueDate || '9999').localeCompare(b.order.dueDate || '9999'));
  const payables = state.purchases.filter(purchase => !purchase.archived).map(purchase => ({ purchase, balance: purchaseBalance(state, purchase) }))
    .filter(row => row.balance !== 0).sort((a, b) => (a.purchase.dueDate || '9999').localeCompare(b.purchase.dueDate || '9999'));
  const needs = state.purchaseNeeds.filter(need => !need.archived && need.purchased < need.quantity && mine(need.responsible))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dueToday = tasks.filter(task => task.date && task.date <= day).length;
  const commitments = state.orders.filter(order => !order.archived && !order.isSimulation && ['Confirmado', 'En preparación'].includes(order.status) &&
    order.deliveryDate >= day && order.deliveryDate <= until && mine(order.responsible));

  return <div className="stack">
    <PageHeader eyebrow={dateLabel(day)} title={`Hola, ${profile}`} description="Lo que debemos atender, preparar y recordar. La información es compartida." actions={<Link className="btn btn-primary" to="/consultas/nueva"><MessageCircle size={18} />Nueva consulta</Link>} />
    <Tabs value={view} onChange={setView} values={[{ id: 'all', label: 'Todo' }, { id: 'mine', label: 'Mi trabajo' }]} />
    {!state.settings.onboardingDone && <Notice tone="warning">Antes de operar, revisen datos, responsables, cuentas y condiciones reales del negocio. <Link className="text-link" to="/ajustes">Revisar configuración</Link></Notice>}

    <div className="stat-grid home-actions">
      <Link className="card quick-action" to="/consultas/nueva"><MessageCircle size={23} /><strong>Nueva consulta</strong><span>Guardar lo que solicita una persona</span><ArrowUpRight size={17} /></Link>
      <Link className="card quick-action" to="/dinero?action=cobro"><Wallet size={23} /><strong>Registrar cobro</strong><span>Un adelanto o pago recibido</span><ArrowUpRight size={17} /></Link>
      <Link className="card quick-action" to="/dinero?action=compra"><ShoppingBag size={23} /><strong>Compra o gasto</strong><span>Lo que compramos o debemos pagar</span><ArrowUpRight size={17} /></Link>
      <Link className="card quick-action" to="/ferias"><ClipboardList size={23} /><strong>Venta en feria</strong><span>Registrar la jornada y sus ventas</span><ArrowUpRight size={17} /></Link>
    </div>

    <div className="stat-grid">
      <Stat label="Consultas por responder" value={inquiries.filter(inquiry => !inquiry.waitingClient).length} detail="Sin primera respuesta registrada" icon={<MessageCircle size={19} />} action={<Link className="text-link" to="/pedidos?tab=consultas">Ver consultas</Link>} />
      <Stat label="Tareas de hoy o anteriores" value={dueToday} detail="Pendientes o en curso" icon={<CalendarDays size={19} />} action={<Link className="text-link" to="/agenda">Revisar agenda</Link>} />
      <Stat label="Próximos compromisos" value={commitments.length} detail="Pedidos en los próximos 14 días" icon={<ClipboardList size={19} />} action={<Link className="text-link" to="/agenda">Ver dos semanas</Link>} />
      <Stat label="Compras por completar" value={needs.length} detail="Necesidades registradas sin atender por completo" icon={<ShoppingBag size={19} />} action={<Link className="text-link" to="/agenda?tab=compras">Revisar lista</Link>} />
    </div>

    <div className="split-grid">
      <Card title="Por responder" subtitle="Primero compromisos vencidos, después los de hoy y los que aún no tienen plazo" action={<Link className="text-link" to="/pedidos?tab=consultas">Ver todas</Link>}>
        {inquiries.length ? inquiries.slice(0, 6).map(inquiry => <div className="list-row" key={inquiry.id}>
          <div className="list-main">
            <Link className="text-link" to={`/consultas/${inquiry.id}`}>{clientName(inquiry.clientId, inquiry.contactName)}</Link>
            <p>{inquiry.summary}</p>
            <small className="muted">{inquiry.modality} · {inquiry.channel} · {inquiry.responsible} · {dateLabel(inquiry.receivedAt)}</small>
            <p><strong>Qué sigue:</strong> {inquiry.nextAction || 'Precisar la solicitud'}</p>
            {inquiry.waitingClient ? <Badge>Esperando al cliente</Badge> : inquiry.responseDue ? <Badge tone={inquiry.responseDue < now ? 'danger' : 'warning'}>{inquiry.responseDue < now ? 'Plazo vencido' : 'Responder antes de'} · {dateLabel(inquiry.responseDue)}</Badge> : <Badge>Plazo por acordar</Badge>}
          </div>
        </div>) : <Empty title="No hay consultas pendientes registradas" text="Puedes revisar las conversaciones o registrar una nueva consulta." />}
      </Card>

      <Card title="Qué debemos hacer" subtitle="Hoy, tareas anteriores y los próximos tres días" action={<Link className="text-link" to="/agenda">Ver dos semanas</Link>}>
        {nearTasks.length ? nearTasks.slice(0, 6).map(task => <div className="list-row" key={task.id}>
          <div className="list-main"><Link className="text-link" to={`/agenda?task=${encodeURIComponent(task.id)}`}>{task.title}</Link>
            <p>{task.kind} · {task.responsible}{task.collaborator ? ` · Apoyo: ${task.collaborator}` : ''}</p>
            <small className="muted">{task.date ? dateLabel(task.date) : 'Fecha por programar'}{task.time ? ` · ${task.time}` : ''} · {task.minutes === null ? 'Duración por estimar' : `${task.minutes} minutos`}</small>
            {task.resourceStatus === 'Por confirmar' && <p><Badge tone="warning">Recurso o apoyo por confirmar{task.resource ? `: ${task.resource}` : ''}</Badge></p>}
            {task.date && task.date < day && <Badge tone="warning">Revisar fecha de esta tarea</Badge>}
          </div><Badge tone={task.status === 'En curso' ? 'purple' : 'neutral'}>{task.status}</Badge>
        </div>) : <Empty title="No hay pendientes registrados para estos días" text="Revisa la próxima semana o añade las etapas de un pedido. No tener tareas registradas no confirma disponibilidad." />}
      </Card>
    </div>

    <div className="split-grid">
      <Card title="Por cobrar o devolver" subtitle="Acuerdos confirmados; el cobro y la entrega se registran por separado" action={<Link className="text-link" to="/dinero?tab=pendientes">Ver Dinero</Link>}>
        {receivables.length ? receivables.slice(0, 4).map(({ order, balance }) => <div className="list-row" key={order.id}>
          <div className="list-main"><Link className="text-link" to={`/pedidos/${order.id}`}>{order.code} · {clientName(order.clientId, order.contactName)}</Link><p>{order.dueDate ? `Fecha acordada: ${dateLabel(order.dueDate)}` : 'Fecha de pago por acordar'}</p><small>{order.status} · {order.responsible}</small></div>
          <div className="stack"><strong>{money(Math.abs(balance))}</strong><Badge tone={balance < 0 ? 'warning' : 'neutral'}>{balance < 0 ? 'Saldo a favor del cliente' : 'Por cobrar'}</Badge></div>
        </div>) : <Empty text="No hay saldos pendientes en los pedidos registrados." />}
      </Card>
      <Card title="Por pagar o recuperar" subtitle="Obligaciones compartidas del negocio" action={<Link className="text-link" to="/dinero?tab=pendientes">Ver compras</Link>}>
        {payables.length ? payables.slice(0, 4).map(({ purchase, balance }) => <div className="list-row" key={purchase.id}>
          <div className="list-main"><strong>{purchase.description}</strong><p>{purchase.dueDate ? dateLabel(purchase.dueDate) : 'Vencimiento por acordar'}</p><small>{state.suppliers.find(supplier => supplier.id === purchase.supplierId)?.name || 'Proveedor por identificar'}</small></div>
          <div className="stack"><strong>{money(Math.abs(balance))}</strong><Badge tone={balance < 0 ? 'warning' : 'neutral'}>{balance < 0 ? 'A recuperar' : 'Por pagar'}</Badge></div>
        </div>) : <Empty text="No hay obligaciones pendientes en las compras registradas." />}
      </Card>
    </div>

    <Card title="Materiales del negocio" subtitle="Referencias para revisar la oferta y compartir lo que está disponible">
      <div className="inline-actions"><Link className="btn btn-secondary" to="/productos">Productos y precios</Link><Link className="btn btn-secondary" to="/agenda?tab=compras">Compras pendientes</Link>
        {safeUrl(state.settings.catalogUrl) && <ExternalLink href={safeUrl(state.settings.catalogUrl)}>Consultar catálogo</ExternalLink>}
        {safeUrl(state.settings.standUrl) && <ExternalLink href={safeUrl(state.settings.standUrl)}>Propuesta de stand</ExternalLink>}
      </div><p className="muted">Los materiales preliminares no sustituyen la revisión de disponibilidad, precio y condiciones de cada encargo.</p>
    </Card>
  </div>;
}

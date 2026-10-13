import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Users, ShieldCheck, GraduationCap, School, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOverview } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSuperTheme } from '../../components/superTheme';
import { PageHeader, Panel, Button, Pill, Empty } from '../../components/superUi';
import ActivityRow from '../../components/ActivityRow';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function ControlRoom() {
  const { user } = useAuth();
  const th = useSuperTheme();
  const t = th.t;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getOverview()
      .then(r => setData(r.data))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const firstName = (user?.fullName || '').split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long', day: 'numeric', month: 'long' });

  const chart = useMemo(() => {
    const days = data?.activity || [];
    return {
      data: {
        labels: days.map(d => {
          const [y, m, dd] = d.date.split('-').map(Number);
          return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
        }),
        datasets: [{
          label: 'Events',
          data: days.map(d => d.count),
          backgroundColor: days.map((_, i) => (i === days.length - 1 ? th.gold : th.goldLine)),
          hoverBackgroundColor: th.goldStrong,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
          barPercentage: 0.62,
          categoryPercentage: 0.9,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface, titleColor: t.text, bodyColor: t.textMuted,
            borderColor: t.border, borderWidth: 1, padding: 10, displayColors: false,
            callbacks: { label: ctx => `${ctx.parsed.y} event${ctx.parsed.y === 1 ? '' : 's'}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { color: t.border },
               ticks: { color: t.textFaint, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 } },
          y: { beginAtZero: true, grid: { color: t.chartGrid }, border: { display: false },
               ticks: { color: t.textFaint, font: { size: 11 }, precision: 0, maxTicksLimit: 5 } },
        },
      },
    };
  }, [data, th.gold, th.goldLine, th.goldStrong, t]);

  const c = data?.counts || {};
  const p = data?.pulse || {};
  const maxActor = Math.max(1, ...(data?.topActors || []).map(a => a.count));

  return (
    <div>
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, ${firstName}`}
        subtitle="Everything that happens in the school system — who did it, when, and what changed."
        actions={<Button variant="ghost" onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</Button>}
      />

      {/* ── Headcount ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 16 }}>
        <Stat icon={Users}          label="Active teachers" value={c.activeTeachers} loading={loading} to="/admin/teachers" />
        <Stat icon={ShieldCheck}    label="Active admins"   value={c.activeAdmins}   loading={loading} to="/superadmin/admins" />
        <Stat icon={GraduationCap}  label="Active students" value={c.activeStudents} loading={loading} to="/admin/students" />
        <Stat icon={School}         label="Classes"         value={c.classes}        loading={loading} to="/admin/classes" />
      </div>

      {/* ── Pulse strip ── */}
      <Panel pad={0} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <Pulse label="Events today"        value={p.eventsToday} />
          <Pulse label="Sign-ins today"      value={p.loginsToday} />
          <Pulse label="People seen today"   value={p.usersSeenToday} />
          <Pulse label="Mark changes · 24h"  value={p.markChanges24h} />
          <Pulse label="Reports today"       value={p.reportsToday} />
          <Pulse label="Failed sign-ins · 24h" value={p.failedLogins24h} alert={p.failedLogins24h > 0}
                 to="/superadmin/activity?action=LOGIN_FAILED" />
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16, marginBottom: 16 }}>
        <Panel title="Activity · last 14 days" right={<span style={{ fontSize: 12, color: t.textFaint }}>events per day (EAT)</span>}>
          <div style={{ height: 220 }}>
            {data ? <Bar data={chart.data} options={chart.options} aria-label="Events per day, last 14 days" role="img" />
                  : <Empty>{loading ? 'Loading…' : 'No data'}</Empty>}
          </div>
        </Panel>

        <Panel title="Most active · last 7 days">
          {(data?.topActors || []).length === 0 ? <Empty>{loading ? 'Loading…' : 'No activity yet'}</Empty> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {data.topActors.map(a => (
                <Link key={a.username} to={`/superadmin/activity?actor=${encodeURIComponent(a.username)}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontFamily: th.mono, fontWeight: 700, color: t.text }}>
                      @{a.username} <span style={{ fontFamily: 'inherit', fontWeight: 500, color: t.textFaint }}>
                        · {(a.role || '').toLowerCase()}</span>
                    </span>
                    <span style={{ color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}>{a.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: t.rowAlt, overflow: 'hidden' }}>
                    <div style={{ width: `${(a.count / maxActor) * 100}%`, height: '100%', borderRadius: 3, background: th.gold }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Latest activity"
        right={<Link to="/superadmin/activity" style={{ fontSize: 13, fontWeight: 700, color: th.gold, textDecoration: 'none' }}>Full log →</Link>}
        pad={14}>
        {(data?.recent || []).length === 0
          ? <Empty>{loading ? 'Loading…' : 'Nothing recorded yet. Activity appears here as people use the system.'}</Empty>
          : data.recent.map(e => <ActivityRow key={e.id} e={e} showDate compact={window.innerWidth < 640} />)}
      </Panel>
    </div>
  );
}

function Stat({ icon: Icon, label, value, loading, to }) {
  const th = useSuperTheme();
  const t = th.t;
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14, boxShadow: `0 1px 2px ${t.shadow}`,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: th.goldSoft, color: th.gold,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} />
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: t.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {loading && value == null ? '–' : (value ?? 0)}
          </div>
          <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4 }}>{label}</div>
        </div>
      </div>
    </Link>
  );
}

function Pulse({ label, value, alert, to }) {
  const th = useSuperTheme();
  const t = th.t;
  const body = (
    <div style={{ padding: '14px 18px', borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
                  marginRight: -1, marginBottom: -1, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 800,
                    color: alert ? t.danger : t.text, fontVariantNumeric: 'tabular-nums' }}>
        {alert && <AlertTriangle size={16} />}{value ?? '–'}
      </div>
      <div style={{ fontSize: 12, color: alert ? t.danger : t.textMuted, marginTop: 3 }}>{label}</div>
      {alert && <Pill color={t.danger} bg={t.dangerBg} style={{ marginTop: 6 }}>Review</Pill>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{body}</Link> : body;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuditLog, getAuditActors, exportAuditLog } from '../../api/client';
import { useSuperTheme, nairobiDayKey, dayHeading, saveBlob } from '../../components/superTheme';
import { PageHeader, Panel, Button, Empty, useInputStyle } from '../../components/superUi';
import ActivityRow from '../../components/ActivityRow';

const PAGE_SIZE = 50;
const CATEGORIES = ['AUTH', 'MARKS', 'STUDENTS', 'TEACHERS', 'ADMINS', 'CLASSES', 'SUBJECTS', 'EXAMS', 'ASSIGNMENTS', 'REPORTS'];
const FILTER_KEYS = ['q', 'category', 'action', 'actor', 'role', 'from', 'to'];

const nairobiToday = (offsetDays = 0) =>
  new Date(Date.now() - offsetDays * 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });

export default function ActivityLog() {
  const th = useSuperTheme();
  const t = th.t;
  const input = useInputStyle();
  const [params, setParams] = useSearchParams();

  // Filters live in the URL, so a filtered view can be bookmarked / shared with yourself
  const filters = useMemo(() => {
    const f = {};
    FILTER_KEYS.forEach(k => { const v = params.get(k); if (v) f[k] = v; });
    return f;
  }, [params]);

  const [rows, setRows]       = useState([]);
  const [page, setPage]       = useState(0);
  const [total, setTotal]     = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actors, setActors]   = useState([]);
  const [search, setSearch]   = useState(filters.q || '');
  const [exporting, setExporting] = useState(false);
  const reqId = useRef(0);

  const setFilter = useCallback((key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const setRange = (from, to) => {
    const next = new URLSearchParams(params);
    from ? next.set('from', from) : next.delete('from');
    to ? next.set('to', to) : next.delete('to');
    setParams(next, { replace: true });
  };

  // Debounce the free-text search
  useEffect(() => {
    const id = setTimeout(() => { if ((filters.q || '') !== search.trim()) setFilter('q', search.trim()); }, 350);
    return () => clearTimeout(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback((pageToLoad) => {
    const id = ++reqId.current;
    setLoading(true);
    getAuditLog({ ...filters, page: pageToLoad, size: PAGE_SIZE })
      .then(({ data }) => {
        if (id !== reqId.current) return; // a newer filter won the race
        setRows(prev => (pageToLoad === 0 ? data.content : [...prev, ...data.content]));
        setTotal(data.totalElements);
        setHasMore(data.page + 1 < data.totalPages);
        setPage(data.page);
      })
      .catch(err => { if (id === reqId.current) toast.error(err.response?.data?.message || 'Failed to load activity'); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [filters]);

  useEffect(() => { load(0); }, [load]);
  useEffect(() => { getAuditActors().then(r => setActors(r.data)).catch(() => {}); }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await exportAuditLog(filters);
      saveBlob(data, `activity_log_${nairobiToday()}.csv`);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Group rows by Nairobi day
  const groups = useMemo(() => {
    const out = [];
    rows.forEach(r => {
      const key = nairobiDayKey(r.at);
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, items: [] });
      out[out.length - 1].items.push(r);
    });
    return out;
  }, [rows]);

  const activeCount = Object.keys(filters).length;
  const compact = window.innerWidth < 640;

  const quick = [
    { label: 'Today',          on: filters.from === nairobiToday() && filters.to === nairobiToday(), apply: () => setRange(nairobiToday(), nairobiToday()) },
    { label: 'Last 7 days',    on: filters.from === nairobiToday(6) && !filters.to, apply: () => setRange(nairobiToday(6), '') },
    { label: 'Mark changes',   on: filters.category === 'MARKS' && filters.action === 'UPDATE',
      apply: () => { const n = new URLSearchParams(params); n.set('category', 'MARKS'); n.set('action', 'UPDATE'); setParams(n, { replace: true }); } },
    { label: 'Failed sign-ins', on: filters.action === 'LOGIN_FAILED', apply: () => setFilter('action', 'LOGIN_FAILED') },
    { label: 'Report downloads', on: filters.category === 'REPORTS', apply: () => setFilter('category', 'REPORTS') },
  ];

  const chip = (on) => ({
    padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
    border: `1.5px solid ${on ? th.gold : t.border}`, background: on ? th.goldSoft : 'transparent',
    color: on ? th.goldStrong : t.textMuted, whiteSpace: 'nowrap',
  });

  return (
    <div>
      <PageHeader
        eyebrow="Audit trail"
        title="Activity log"
        subtitle="Every sign-in, mark entry and change made by teachers and admins. Kept permanently; only you can see it."
        actions={<Button variant="ghost" onClick={exportCsv} disabled={exporting}>
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>}
      />

      {/* ── Filters ── */}
      <Panel pad={16} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div style={{ position: 'relative', gridColumn: compact ? 'auto' : 'span 2' }}>
            <Search size={15} color={t.textFaint} style={{ position: 'absolute', left: 11, top: 11 }} />
            <input style={{ ...input, paddingLeft: 32 }} placeholder="Search student, subject, name…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={input} value={filters.category || ''} onChange={e => setFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{th.category[c]?.label || c}</option>)}
          </select>
          <select style={input} value={filters.actor || ''} onChange={e => setFilter('actor', e.target.value)}>
            <option value="">Everyone</option>
            {actors.map(a => <option key={a} value={a}>@{a}</option>)}
          </select>
          <select style={input} value={filters.role || ''} onChange={e => setFilter('role', e.target.value)}>
            <option value="">All roles</option>
            <option value="TEACHER">Teachers</option>
            <option value="ADMIN">Admins</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
          <input style={input} type="date" value={filters.from || ''} max={filters.to || undefined}
            onChange={e => setFilter('from', e.target.value)} aria-label="From date" />
          <input style={input} type="date" value={filters.to || ''} min={filters.from || undefined}
            onChange={e => setFilter('to', e.target.value)} aria-label="To date" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {quick.map(q => <button key={q.label} style={chip(q.on)} onClick={q.apply}>{q.label}</button>)}
          {activeCount > 0 && (
            <button style={{ ...chip(false), display: 'inline-flex', alignItems: 'center', gap: 4, color: t.danger }}
              onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); }}>
              <X size={13} /> Clear ({activeCount})
            </button>
          )}
        </div>
      </Panel>

      {/* ── Results ── */}
      <Panel pad={14}
        title={loading && rows.length === 0 ? 'Loading…' : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
        right={activeCount > 0 ? <span style={{ fontSize: 12, color: t.textFaint }}>filtered</span> : null}>
        {!loading && rows.length === 0 && <Empty>No activity matches these filters.</Empty>}

        {groups.map(g => (
          <div key={g.key} style={{ marginBottom: 6 }}>
            <div style={{
              position: 'sticky', top: compact ? 104 : 61, zIndex: 2, background: t.surface,
              padding: '10px 4px 6px', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: t.textFaint, borderBottom: `1px solid ${t.border}`,
            }}>
              {dayHeading(g.key)}
              <span style={{ fontWeight: 600, marginLeft: 8 }}>· {g.items.length}{hasMore && g === groups[groups.length - 1] ? '+' : ''}</span>
            </div>
            {g.items.map(e => <ActivityRow key={e.id} e={e} compact={compact} />)}
          </div>
        ))}

        {hasMore && (
          <div style={{ textAlign: 'center', paddingTop: 14 }}>
            <Button variant="ghost" onClick={() => load(page + 1)} disabled={loading}>
              {loading ? 'Loading…' : `Load ${PAGE_SIZE} more`}
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

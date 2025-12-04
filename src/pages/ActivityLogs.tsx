import React from 'react'
import { Box, Button, Stack, Typography, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, LinearProgress, Chip } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import RefreshIcon from '@mui/icons-material/Refresh'
import { supabase } from '../supabaseClient'

// Concrete table
const ACTIVITY_TABLE = 'activity_logs'
const PROFILES_TABLE = 'profiles'

type ActivityRow = {
  id: string | number
  user_id: string | null
  target_user_id?: string | null
  action: string
  details: any
  user_agent?: string | null
  created_at: string
  actor_name?: string
  target_name?: string
}

function formatLocal(dt: string) {
  try {
    const d = new Date(dt)
    // Prefer nice, readable format
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return dt
  }
}

function relativeFromNow(dt: string) {
  const now = Date.now()
  const t = new Date(dt).getTime()
  const diffSec = Math.round((now - t) / 1000)
  if (Number.isNaN(diffSec)) return ''
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}

const columns: GridColDef[] = [
  {
    field: 'created_at',
    headerName: 'Time',
    flex: 1,
    minWidth: 200,
    renderCell: (p) => (
      <Stack spacing={0}>
        <Typography variant="body2">{formatLocal(String(p.value))}</Typography>
        <Typography variant="caption" color="text.secondary">{relativeFromNow(String(p.value))}</Typography>
      </Stack>
    ),
    sortComparator: (v1, v2) => new Date(v1 as any).getTime() - new Date(v2 as any).getTime(),
  },
  {
    field: 'action',
    headerName: 'Action',
    flex: 0.7,
    minWidth: 150,
    renderCell: (p) => {
      const val = String(p.value ?? '')
      const color = val.toLowerCase() === 'login' ? 'primary' : val.toLowerCase() === 'logout' ? 'default' : 'warning'
      return <Chip size="small" label={val} color={color as any} />
    },
  },
  // Move the full name columns backward (to the right) by placing User Agent first
  // Removed User Agent column per request (to hide long Mozilla strings)
  { field: 'actor_name', headerName: 'Actor', flex: 0.9, minWidth: 200 },
  { field: 'target_name', headerName: 'Target User', flex: 0.9, minWidth: 200 },
  {
    field: 'details',
    headerName: 'Details',
    flex: 1.4,
    minWidth: 260,
    renderCell: (p) => {
      const action = String((p as any)?.row?.action ?? '').toLowerCase()
      // Hide login/logout boilerplate messages
      if (action === 'login' || action === 'logout') return ''
      const v = p.value as any;
      if (v == null) return '';
      // Hide the unhelpful "[object Object]" output; show strings only
      if (typeof v === 'string') {
        if (v.trim() === '[object Object]') return '';
        // If it's a JSON string, try to show a concise summary
        try {
          const obj = JSON.parse(v);
          // Prefer a common message field if present
          const hint = obj?.message || obj?.note || obj?.info || obj?.reason;
          return <Typography variant="body2">{hint ? String(hint) : ''}</Typography>;
        } catch {
          return <Typography variant="body2">{v}</Typography>;
        }
      }
      // If it's an object, try to pick a useful field; otherwise keep it empty
      if (typeof v === 'object') {
        const hint = (v as any)?.message || (v as any)?.note || (v as any)?.info || (v as any)?.reason || '';
        return <Typography variant="body2">{hint}</Typography>;
      }
      return <Typography variant="body2">{String(v)}</Typography>;
    }
  },
]

export default function ActivityLogs() {
  const theme = useTheme()
  const [rows, setRows] = React.useState<ActivityRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [actionFilter, setActionFilter] = React.useState<'all' | 'Login' | 'Logout' | 'Edit Profile' | 'profile_update'>('all')
  const [startDate, setStartDate] = React.useState<string>('')
  const [endDate, setEndDate] = React.useState<string>('')
  const [search, setSearch] = React.useState<string>('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let query = supabase
        .from(ACTIVITY_TABLE)
        .select('id, user_id, target_user_id, action, details, created_at')

      if (actionFilter !== 'all') {
        // Normalize to lowercase to match standardized actions
        query = query.eq('action', String(actionFilter).toLowerCase())
      }
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00.000Z`)
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59.999Z`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const baseRows = (data as any as ActivityRow[]) ?? []

      // Resolve names from profiles in one batch to avoid FK naming assumptions
      const ids = new Set<string>()
      for (const r of baseRows) {
        if (r.user_id) ids.add(r.user_id)
        if (r.target_user_id) ids.add(r.target_user_id)
      }

      let nameMap = new Map<string, string>()
      if (ids.size > 0) {
        const { data: profs, error: pErr } = await supabase
          .from(PROFILES_TABLE)
          .select('id, full_name, first_name, last_name, email')
          .in('id', Array.from(ids))
        if (!pErr && profs) {
          for (const p of profs as any[]) {
            const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id
            nameMap.set(p.id, name)
          }
        }
      }

      const withNames = baseRows.map((r) => {
        const actorId = r.user_id || ''
        const targetId = r.target_user_id || ''
        const actorName = actorId ? (nameMap.get(actorId) ?? actorId) : ''
        const targetNameRaw = targetId ? (nameMap.get(targetId) ?? targetId) : ''
        // Hide duplicate names: if same user acted on themselves or same name/id
        const samePerson = actorId && targetId && actorId === targetId
        const sameName = !!actorName && !!targetNameRaw && actorName === targetNameRaw
        const target_name = (samePerson || sameName || String(r.action).toLowerCase() === 'profile_update') ? '' : targetNameRaw
        return { ...r, actor_name: actorName, target_name }
      })

      setRows(withNames)
    } catch (e: any) {
      console.error('Failed to load activity logs:', e)
      setErrorMsg(e?.message ?? 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }, [actionFilter, startDate, endDate])

  React.useEffect(() => {
    // initial load and on filters change
    load()
  }, [load])

  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const action = (r.action ?? '').toLowerCase()
      const userId = (r.user_id ?? '').toLowerCase()
      const targetId = (r.target_user_id ?? '').toLowerCase()
      const actorName = r.actor_name ? String(r.actor_name).toLowerCase() : ''
      const detailsText = typeof r.details === 'string'
        ? r.details.toLowerCase()
        : JSON.stringify(r.details ?? {}).toLowerCase()
      return (
        action.includes(q) ||
        userId.includes(q) ||
        targetId.includes(q) ||
        actorName.includes(q) ||
        detailsText.includes(q)
      )
    })
  }, [rows, search])

  // CSV export (uses currently filtered rows)
  const handleExportCSV = React.useCallback(() => {
    if (!filteredRows.length) return;
    const headers = ['created_at','action','actor_name','target_name','details'];
    const escape = (v: any) => {
      if (v == null) return '';
      if (typeof v === 'object') {
        // attempt to pick a meaningful field; skip generic object representation
        const hint = v.message || v.note || v.info || v.reason || '';
        v = hint;
      } else if (typeof v === 'string') {
        // remove literal [object Object]
        if (v.trim() === '[object Object]') v = '';
        // if JSON string, parse and extract message-like field
        try {
          if (/^[{\[]/.test(v.trim())) {
            const obj = JSON.parse(v);
            const hint = obj?.message || obj?.note || obj?.info || obj?.reason;
            if (hint) v = String(hint);
          }
        } catch { /* ignore parse errors */ }
      }
      const s = String(v).replace(/"/g,'""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.join(',')];
    for (const r of filteredRows) {
      const a = String(r.action ?? '').toLowerCase()
      const details = (a === 'login' || a === 'logout') ? '' : r.details
      lines.push([
        escape(r.created_at),
        escape(r.action),
        escape(r.actor_name),
        escape(r.target_name),
        escape(details)
      ].join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `activity_logs_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  const clearFilters = () => {
    setActionFilter('all')
    setStartDate('')
    setEndDate('')
    setSearch('')
  }

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h5" fontWeight={700} color="primary.main">Activity Logs</Typography>
        <Button onClick={load} startIcon={<RefreshIcon/>} disabled={loading} variant="contained" color="primary" size="small">
          Refresh
        </Button>
        <Button onClick={handleExportCSV} startIcon={<DownloadIcon/>} disabled={!filteredRows.length} variant="outlined" color="primary" size="small">
          Export CSV
        </Button>
        <Box flex={1} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="action-filter">Action</InputLabel>
          <Select
            labelId="action-filter"
            label="Action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="Login">Login</MenuItem>
            <MenuItem value="Logout">Logout</MenuItem>
            <MenuItem value="Edit Profile">Edit Profile</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Search"
          placeholder="action, details, user id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ) }}
        />
        <Button onClick={clearFilters} size="small">Clear</Button>
      </Stack>
      <Box sx={{ flex: 1, width: '100%' }}>
        {errorMsg && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>{errorMsg}</Typography>
        )}
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 20 } },
          }}
          pageSizeOptions={[10, 20, 50]}
          getRowId={(r) => r.id}
          sx={{
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        />
      </Box>
    </Stack>
  )
}

// Provide a named export for environments where default import may error
export { ActivityLogs as ActivityLogsComponent }
 

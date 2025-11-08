import React from 'react'
import { Box, Button, Stack, Typography, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, LinearProgress, Chip } from '@mui/material'
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
  details: string
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
  { field: 'details', headerName: 'Details', flex: 1.4, minWidth: 260 },
  { field: 'actor_name', headerName: 'Actor', flex: 0.9, minWidth: 200 },
  { field: 'target_name', headerName: 'Target User', flex: 0.9, minWidth: 200 },
  { field: 'user_agent', headerName: 'User Agent', flex: 1.2, minWidth: 260 },
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
        .select('id, user_id, target_user_id, action, details, user_agent, created_at')

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
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

      const withNames = baseRows.map((r) => ({
        ...r,
        actor_name: r.user_id ? nameMap.get(r.user_id) ?? r.user_id : '',
        target_name: r.target_user_id ? nameMap.get(r.target_user_id) ?? r.target_user_id : '',
      }))

      setRows(withNames)
    } catch (e: any) {
      setErrorMsg(e?.message || String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [actionFilter, startDate, endDate])

  React.useEffect(() => {
    load()
  }, [load])

  // Realtime: auto-refresh when activity_logs change
  React.useEffect(() => {
    const channel = supabase
      .channel('activity-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: ACTIVITY_TABLE }, () => {
        // debounce minimal
        load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => {
      return (
        (r.action ?? '').toLowerCase().includes(q) ||
        (r.details ?? '').toLowerCase().includes(q) ||
        (r.user_id ?? '').toLowerCase().includes(q) ||
        (r.target_user_id ?? '').toLowerCase().includes(q) ||
        (r.user_agent ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, search])

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
 

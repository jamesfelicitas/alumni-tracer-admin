import React from 'react'
import {
  Card, CardContent, Typography, Stack, TextField, LinearProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton, Tooltip, Button
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { supabase } from '../supabaseClient'
import { logActivity } from '../activityLog'

type Row = {
  id: string
  first_name: string | null
  last_name: string | null
  course: string | null
  graduation_year: number | null
  is_verified: boolean | null
  verified_at: string | null
  verified_by: string | null
  role?: string | null
  // source info for "Not Alumni" flag
  flagged_by_name?: string | null
  flagged_by_role?: string | null
  flagged_at?: string | null
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch { return d || '—' }
}

export default function AlumniVerificationAdmin() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,course,graduation_year,is_verified,verified_at,verified_by,role')
        .order('last_name', { ascending: true })
        .limit(1000)
      if (error) throw error

      const base = (data ?? []) as Row[]
      const flaggedIds = base.filter(r => r.role === 'not_alumni').map(r => r.id)
      let enriched = base

      if (flaggedIds.length > 0) {
        const { data: logs, error: logErr } = await supabase
          .from('activity_logs')
          .select('target_user_id,user_id,action,created_at')
          .eq('action', 'mark not alumni')
          .in('target_user_id', flaggedIds)
          .order('created_at', { ascending: false })

        if (!logErr && logs) {
          const latestByTarget = new Map<string, { target_user_id: string; user_id: string | null; created_at: string | null }>()
          for (const l of logs as any[]) {
            const t = l.target_user_id
            if (t && !latestByTarget.has(t)) latestByTarget.set(t, { target_user_id: t, user_id: l.user_id ?? null, created_at: l.created_at ?? null })
          }

          const actorIds = Array.from(new Set(Array.from(latestByTarget.values()).map(v => v.user_id).filter(Boolean))) as string[]
          const actors = new Map<string, { name: string; role: string | null }>()
          if (actorIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id,first_name,last_name,role')
              .in('id', actorIds)
            for (const p of (profs ?? []) as any[]) {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
              actors.set(p.id, { name, role: p.role ?? null })
            }
          }

          enriched = base.map(r => {
            const log = latestByTarget.get(r.id)
            if (r.role === 'not_alumni' && log) {
              const actor = log.user_id ? actors.get(log.user_id) : undefined
              return {
                ...r,
                flagged_by_name: actor?.name ?? (log.user_id ?? null),
                flagged_by_role: actor?.role ?? null,
                flagged_at: log.created_at ?? null,
              }
            }
            return r
          })
        }
      }

      setRows(enriched)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const toggleVerify = async (r: Row) => {
    const nextVerified = !r.is_verified
    setSavingId(r.id)
    setRows(prev => prev.map(x => x.id === r.id
      ? { ...x, is_verified: nextVerified, verified_at: nextVerified ? new Date().toISOString() : null }
      : x
    ))
    try {
      const { data: u } = await supabase.auth.getUser()
      const adminId = u.user?.id || null
      const payload: Partial<Row> = {
        is_verified: nextVerified,
        verified_at: nextVerified ? new Date().toISOString() : null,
        verified_by: nextVerified ? adminId : null
      }
      const { error } = await supabase.from('profiles').update(payload).eq('id', r.id)
      if (error) throw error
      await logActivity(
        supabase,
        nextVerified ? 'Verify Alumni' : 'Unverify Alumni',
        `alumni_id=${r.id}; name=${(r.last_name || '')}, ${(r.first_name || '')}`,
        r.id
      )
    } catch (e: any) {
      setError(e.message || 'Update failed')
      setRows(prev => prev.map(x => x.id === r.id ? r : x))
    } finally {
      setSavingId(null)
    }
  }

  const markNotAlumni = async (r: Row) => {
    setSavingId(r.id)
    setRows(prev => prev.map(x => x.id === r.id
      ? { ...x, is_verified: false, verified_at: null, role: 'not_alumni' }
      : x
    ))
    try {
      const { data: u } = await supabase.auth.getUser()
      const adminId = u.user?.id || null
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: false, verified_at: null, verified_by: adminId, role: 'not_alumni' })
        .eq('id', r.id)
      if (error) throw error
      await logActivity(
        supabase,
        'Mark Not Alumni',
        `alumni_id=${r.id}; name=${(r.last_name || '')}, ${(r.first_name || '')}`,
        r.id
      )
      await load()
    } catch (e: any) {
      setError(e.message || 'Update failed')
      setRows(prev => prev.map(x => x.id === r.id ? r : x))
    } finally {
      setSavingId(null)
    }
  }

  const undoNotAlumni = async (r: Row) => {
    setSavingId(r.id)
    const prev = r
    setRows(prevRows => prevRows.map(x => x.id === r.id
      ? { ...x, role: null, is_verified: false, verified_at: null, verified_by: null, flagged_by_name: null, flagged_by_role: null, flagged_at: null }
      : x
    ))
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: null, is_verified: false, verified_at: null, verified_by: null })
        .eq('id', r.id)
      if (error) throw error
      await logActivity(
        supabase,
        'Undo Not Alumni',
        `alumni_id=${r.id}; name=${(r.last_name || '')}, ${(r.first_name || '')}`,
        r.id
      )
      await load()
    } catch (e: any) {
      setError(e.message || 'Update failed')
      setRows(prevRows => prevRows.map(x => x.id === r.id ? prev : x))
    } finally {
      setSavingId(null)
    }
  }

  const filtered = rows.filter(r => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase()
    const status = r.role === 'not_alumni' ? 'not alumni' : (r.is_verified ? 'verified' : 'pending')
    return (
      name.includes(q) ||
      (r.course || '').toLowerCase().includes(q) ||
      String(r.graduation_year || '').includes(q) ||
      status.includes(q)
    )
  })

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
          <Typography variant="h5" fontWeight={700}>Alumni Verification (Admin)</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search name / course / year / status"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 280 }}
            />
            <Tooltip title="Reload">
              <IconButton onClick={load} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 1 }} />}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Year Graduated</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Verified At</TableCell>
              <TableCell>Flagged By</TableCell>
              <TableCell>MARK NOT ALUMNI BY COORDINATOR</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(r => {
              const name = `${r.last_name || ''}, ${r.first_name || ''}`.trim().replace(/^,|,$/g, '')
              const isVerified = !!r.is_verified
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{name || '—'}</TableCell>
                  <TableCell>{r.course || '—'}</TableCell>
                  <TableCell>{r.graduation_year ?? '—'}</TableCell>
                  <TableCell>
                    {r.role === 'not_alumni'
                      ? <Chip size="small" color="error" label="Not Alumni" />
                      : (isVerified
                          ? <Chip size="small" color="success" label="Verified" />
                          : <Chip size="small" color="warning" label="Pending" />)}
                  </TableCell>
                  <TableCell>{fmtDate(r.verified_at)}</TableCell>
                  <TableCell>
                    {r.role === 'not_alumni'
                      ? (
                        <>
                          <div>{r.flagged_by_role || '—'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{r.flagged_by_name || '—'}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{fmtDate(r.flagged_at)}</div>
                        </>
                      )
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {r.role === 'not_alumni' && (r.flagged_by_role || '').toLowerCase() === 'coordinator' ? (
                      <Tooltip title={`Marked by ${r.flagged_by_name ?? 'Coordinator'} on ${fmtDate(r.flagged_at)}`}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </Tooltip>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {r.role === 'not_alumni' ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        onClick={() => undoNotAlumni(r)}
                        disabled={savingId === r.id}
                      >
                        Undo Not Alumni
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="small"
                          variant={isVerified ? 'outlined' : 'contained'}
                          color={isVerified ? 'warning' : 'success'}
                          onClick={() => toggleVerify(r)}
                          disabled={savingId === r.id}
                        >
                          {isVerified ? 'Mark Pending' : 'Mark Verified'}
                        </Button>
                        <Button
                          size="small"
                          sx={{ ml: 1 }}
                          variant="outlined"
                          color="error"
                          onClick={() => markNotAlumni(r)}
                          disabled={savingId === r.id}
                        >
                          Mark Not Alumni
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
import React from 'react'
import { Stack, Typography, Card, CardContent, CardMedia, LinearProgress, Alert, Box } from '@mui/material'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

// Flexible announcement shape (we'll accept extra optional fields if they exist)
export type Announcement = {
  id: string
  title: string
  body: string
  audience?: string | null
  published_at?: string | null
  created_at: string
  // Optional optional fields if your table has them
  image_url?: string | null
  banner_url?: string | null
  start_at?: string | null
  end_at?: string | null
  location?: string | null
  organization?: string | null
}

function monthDay(dateStr?: string | null) {
  if (!dateStr) return { m: '', d: '', y: '' }
  const d = new Date(dateStr)
  const m = d.toLocaleString(undefined, { month: 'short' }).toUpperCase()
  const day = String(d.getDate())
  const y = String(d.getFullYear())
  return { m, d: day, y }
}

function timeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return ''
  const s = start ? new Date(start) : null
  const e = end ? new Date(end) : null
  if (s && e) {
    const sameDay = s.toDateString() === e.toDateString()
    const date = s.toLocaleString(undefined, { month: 'long', day: 'numeric' })
    const st = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    const et = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return sameDay ? `${date} @ ${st} – ${et}` : `${date} ${st} – ${e.toLocaleString()}`
  }
  if (s) return s.toLocaleString()
  if (e) return e.toLocaleString()
  return ''
}

export default function Announcements() {
  const [rows, setRows] = React.useState<Announcement[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Select all to be forward-compatible with extra optional columns
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const mapped: Announcement[] = (data as any[] ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        audience: r.audience ?? null,
        published_at: r.published_at ?? r.created_at,
        created_at: r.created_at,
        image_url: r.image_url ?? r.banner_url ?? null,
        banner_url: r.banner_url ?? null,
        start_at: r.start_at ?? r.starts_at ?? null,
        end_at: r.end_at ?? r.ends_at ?? null,
        location: r.location ?? null,
        organization: r.organization ?? r.org ?? null,
      }))
      setRows(mapped)
    } catch (e: any) {
      setError(e.message || 'Failed to load announcements')
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => {
    load()
    const ch = supabase
      .channel('announcements-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Latest Past Events</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Stack spacing={3}>
        {rows.map((row) => {
          const when = row.published_at || row.created_at
          const { m, d, y } = monthDay(when)
          const range = timeRange(row.start_at, row.end_at)
          const img = row.image_url || row.banner_url || null
          const excerpt = row.body?.length > 240 ? row.body.slice(0, 240) + '…' : row.body
          return (
            <Stack key={row.id} direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              {/* Date column */}
              <Stack sx={{ minWidth: 72, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>{m}</Typography>
                <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1 }}>{d}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>{y}</Typography>
              </Stack>

              {/* Content card (clickable) */}
              <Card
                variant="outlined"
                sx={{ flex: 1, textDecoration: 'none' }}
                component={Link as any}
                to={`/home/announcements/${row.id}`}
              >
                <CardContent>
                  {range && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {range}
                    </Typography>
                  )}
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                    {row.title}
                  </Typography>
                  {row.organization && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {row.organization}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {excerpt}
                  </Typography>
                </CardContent>
              </Card>

              {/* Image on the right (clickable) */}
              {img && (
                <Card
                  sx={{ width: { xs: '100%', md: 360 }, alignSelf: { xs: 'stretch', md: 'auto' }, textDecoration: 'none' }}
                  component={Link as any}
                  to={`/home/announcements/${row.id}`}
                >
                  <CardMedia component="img" image={img} alt={row.title} sx={{ height: 140, objectFit: 'cover' }} />
                </Card>
              )}
            </Stack>
          )
        })}

        {!loading && rows.length === 0 && (
          <Typography color="text.secondary">No announcements.</Typography>
        )}
      </Stack>
    </Box>
  )
}

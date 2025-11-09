import React from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Box, Stack, Typography, Card, CardMedia, LinearProgress, Alert, Button } from '@mui/material'

type Ann = {
  id: string
  title: string
  body: string
  image_url?: string | null
  banner_url?: string | null
  published_at?: string | null
  created_at: string
  post_url?: string | null
}

function fmt(d?: string | null) {
  if (!d) return ''
  try { return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch { return d || '' }
}

export default function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = React.useState<Ann | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('id,title,body,image_url,banner_url,published_at,created_at,post_url')
          .eq('id', id)
          .maybeSingle()
        if (error) throw error
        if (!data) { setError('Not found'); return }
        setRow({
          id: data.id,
          title: data.title,
          body: data.body,
          image_url: data.image_url ?? data.banner_url ?? null,
          banner_url: data.banner_url ?? null,
          published_at: data.published_at ?? data.created_at,
          created_at: data.created_at,
          post_url: data.post_url ?? null,
        })
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally { setLoading(false) }
    })()
  }, [id])

  if (loading) return <LinearProgress />
  if (error) return <Alert severity="error">{error}</Alert>
  if (!row) return null

  return (
    <Box>
      <Button component={RouterLink} to="/home/announcements" size="small" sx={{ mb: 2 }}>
        ← Back to Announcements
      </Button>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>{row.title}</Typography>
        <Typography variant="caption" color="text.secondary">{fmt(row.published_at || row.created_at)}</Typography>
        {row.image_url && (
          <Card sx={{ maxHeight: 360 }}>
            <CardMedia component="img" image={row.image_url} alt={row.title} sx={{ maxHeight: 360, objectFit: 'cover' }} />
          </Card>
        )}
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{row.body}</Typography>
        {row.post_url && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <a href={row.post_url} target="_blank" rel="noopener noreferrer">View post ↗</a>
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

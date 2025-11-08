import React, { useState } from 'react'
import { Button, Tooltip, Typography, CircularProgress, Stack } from '@mui/material'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { supabase } from '../supabaseClient'
import { logActivityRaw } from '../activityLog'

interface AdminVerifyToggleProps {
  userId: string
  isVerified: boolean
  onChange?: (next: boolean) => void
}

// Admin-only control to toggle alumni verification status.
// Attempts RPC 'set_alumni_verification', falls back to direct update on profiles.
// Logs to activity_logs with action 'Edit Profile'.
const AdminVerifyToggle: React.FC<AdminVerifyToggleProps> = ({ userId, isVerified, onChange }) => {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggle = async () => {
    const next = !isVerified
    setLoading(true)
    setErr(null)
    try {
      // Try RPC first
      const { error: rpcErr } = await supabase.rpc('set_alumni_verification', {
        p_user_id: userId,
        p_verified: next,
      })
      if (rpcErr) {
        // Fallback: update profiles table directly
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ is_verified: next })
          .eq('id', userId)
        if (updErr) throw updErr
      }

      // Log verification change (actor is current user; target is userId)
      const { data } = await supabase.auth.getUser()
      const actor = data.user?.id
      if (actor) {
        await logActivityRaw(
          supabase,
          actor,
          'Edit Profile',
          next ? 'Marked user verified' : 'Marked user unverified',
          userId
        )
      }

      onChange && onChange(next)
    } catch (e: any) {
      setErr(e?.message || 'Failed to update verification')
    } finally {
      setLoading(false)
    }
  }

  const icon = loading ? (
    <CircularProgress size={16} color="inherit" />
  ) : isVerified ? (
    <VerifiedOutlinedIcon fontSize="small" />
  ) : (
    <ShieldOutlinedIcon fontSize="small" />
  )

  return (
    <Stack spacing={0.5} direction="column" alignItems="flex-start">
      <Tooltip
        title={isVerified ? 'Click to mark as unverified' : 'Click to mark as verified'}
        arrow
      >
        <span>
          <Button
            onClick={toggle}
            disabled={loading}
            variant={isVerified ? 'contained' : 'outlined'}
            color={isVerified ? 'success' : 'warning'}
            size="small"
            startIcon={icon}
          >
            {isVerified ? 'Verified' : 'Mark Verified'}
          </Button>
        </span>
      </Tooltip>
      {err && (
        <Typography
          variant="caption"
          color="error"
          display="inline-flex"
          alignItems="center"
          gap={0.5}
        >
          <WarningAmberOutlinedIcon fontSize="inherit" /> {err}
        </Typography>
      )}
    </Stack>
  )
}

export default AdminVerifyToggle

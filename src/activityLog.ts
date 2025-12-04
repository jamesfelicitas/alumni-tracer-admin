import type { SupabaseClient } from '@supabase/supabase-js'

const TABLE = 'activity_logs'

// Insert raw activity row; safely no-op if user_id missing
export async function logActivityRaw(
	supabase: SupabaseClient,
	user_id: string | null | undefined,
	action: string,
	details: string = '',
	target_user_id?: string
) {
	if (!user_id) return
	const { error } = await supabase.from(TABLE).insert({
		user_id,
		action,
		details,
		target_user_id,
		user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
	})
	if (error) console.error('Activity log insert failed:', { action, user_id, error: error.message })
	else console.debug('Activity log insert ok:', { action, user_id })
}

/** Helper dedicated to verification events for consistency. */
export async function logVerification(
	supabase: SupabaseClient,
	actor_user_id: string,
	target_user_id: string,
	nextVerified: boolean
) {
	const action = nextVerified ? 'verify_profile' : 'unverify_profile'
	const details = nextVerified ? 'Marked profile as verified' : 'Marked profile as unverified'
	return logActivityRaw(supabase, actor_user_id, action, details, target_user_id)
}

/** Convenience: use current session user automatically. */
export async function logActivity(
	supabase: SupabaseClient,
	action: string,
	details: string = '',
	target_user_id?: string
) {
	const { data } = await supabase.auth.getUser()
	const uid = data.user?.id
	await logActivityRaw(supabase, uid, action.toLowerCase(), details, target_user_id)
}

/** Sign in with password and log 'Login' on success. */
export async function signInWithPasswordLog(
	supabase: SupabaseClient,
	params: { email: string; password: string }
) {
	const res = await supabase.auth.signInWithPassword(params)
	// On success, record a detailed login event
	if (!res.error && res.data.user) {
		await logActivityRaw(
			supabase,
			res.data.user.id,
			'login',
			JSON.stringify({ message: 'User signed in', email: params.email, source: 'web' })
		)
		return res
	}
	// On failure, record a login failed event without user_id
	// Note: Depending on RLS, this may be visible only to admins.
	if (res.error) {
		try {
			const { data: current } = await supabase.auth.getUser()
			const uid = current?.user?.id
			await logActivityRaw(
				supabase,
				uid ?? null,
				'login_failed',
				JSON.stringify({ message: res.error.message, email: params.email })
			)
		} catch {}
	}
	return res
}

/** Sign out and log 'Logout' before terminating session. */
export async function signOutWithLog(supabase: SupabaseClient) {
	const { data } = await supabase.auth.getUser()
	const uid = data.user?.id
	if (uid) {
		await logActivityRaw(
			supabase,
			uid,
			'logout',
			JSON.stringify({ message: 'User signed out' })
		)
	}
	return supabase.auth.signOut()
}

/** Update current user's profile then log 'Edit Profile'. */
export async function updateProfileWithLog(
	supabase: SupabaseClient,
	updates: Record<string, any>
) {
	const { data: userRes } = await supabase.auth.getUser()
	const user = userRes?.user
	if (!user) throw new Error('Not signed in')

	const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
	if (!error) {
		await logActivityRaw(
			supabase,
			user.id,
			'profile_update',
			`Updated fields: ${Object.keys(updates).join(', ')}`,
			user.id
		)
	}
	return { error }
}


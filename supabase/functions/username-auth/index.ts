import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const usernamePattern = /^[a-z0-9][a-z0-9_.-]{2,23}$/;
const emailDomain = 'users.pearlbudget.invalid';
const legacyEmailDomains = ['users.nidhivora.invalid'];

function response(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { message: 'Method not allowed.' });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return response(400, { message: 'Invalid request body.' });
  }

  if (!payload || typeof payload !== 'object') return response(400, { message: 'Invalid request body.' });
  const { action, username: rawUsername, password } = payload as Record<string, unknown>;
  if (
    (action !== 'sign-in' && action !== 'sign-up') ||
    typeof rawUsername !== 'string' ||
    typeof password !== 'string'
  ) {
    return response(400, { message: 'Enter a username and password.' });
  }

  const username = rawUsername.trim().toLowerCase();
  if (!usernamePattern.test(username)) {
    return response(400, { message: 'Username must be 3–24 characters and use letters, numbers, periods, underscores, or hyphens.' });
  }
  if (password.length < 8 || password.length > 128) {
    return response(400, { message: 'Password must be between 8 and 128 characters.' });
  }

  const projectUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    console.error('Username auth function is missing required Supabase secrets.');
    return response(503, { message: 'Username sign-in is not configured on the server.' });
  }

  const syntheticEmail = `${username}@${emailDomain}`;
  const authClient = createClient(projectUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (action === 'sign-up') {
    const adminClient = createClient(projectUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const legacyDomain of legacyEmailDomains) {
      const { data: legacyUser, error: lookupError } = await adminClient.auth.admin.getUserByEmail(`${username}@${legacyDomain}`);
      if (legacyUser.user) return response(409, { message: 'That username is already in use. Sign in with your existing account.' });
      if (lookupError && lookupError.status !== 404 && lookupError.code !== 'user_not_found') {
        console.error('Could not check username availability.', lookupError.message);
        return response(503, { message: 'Could not verify username availability. Try again.' });
      }
    }

    const { error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { username, username_auth: true },
    });

    if (createError) {
      if (createError.code === 'email_exists' || createError.status === 422) {
        return response(409, { message: 'That username is unavailable. Try another.' });
      }
      console.error('Could not create username account.', createError.message);
      return response(400, { message: 'Could not create the account. Check the password and try again.' });
    }
  }

  let { data, error } = await authClient.auth.signInWithPassword({ email: syntheticEmail, password });
  if (action === 'sign-in' && (error || !data.session)) {
    for (const legacyDomain of legacyEmailDomains) {
      const legacyResult = await authClient.auth.signInWithPassword({
        email: `${username}@${legacyDomain}`,
        password,
      });
      if (!legacyResult.error && legacyResult.data.session) {
        data = legacyResult.data;
        error = null;
        break;
      }
    }
  }

  if (error || !data.session) {
    if (action === 'sign-up') {
      console.error('Username account was created but could not start a session.', error?.message ?? 'No session returned.');
      return response(503, { message: 'Account created, but sign-in could not start. Try signing in.' });
    }
    return response(401, { message: 'Username or password is incorrect.' });
  }

  return new Response(JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  }), { status: 200, headers: jsonHeaders });
});

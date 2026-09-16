import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const roleFromQuery = searchParams.get('role')
  const roleFromCookie =
    request.cookies.get('user_role')?.value ||
    request.cookies.get('intended_role')?.value
  const role = roleFromQuery === 'hr' || roleFromCookie === 'hr' ? 'hr' : 'candidate'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        await supabase.auth.updateUser({
          data: { role },
        })

        const destination = role === 'hr' ? '/dashboard' : '/candidate/dashboard'
        const response = NextResponse.redirect(new URL(destination, request.url))
        response.cookies.set('user_role', role, {
          path: '/',
          sameSite: 'lax',
        })
        response.cookies.set('intended_role', role, {
          path: '/',
          sameSite: 'lax',
        })
        return response
      }

      console.error('exchangeCodeForSession error:', error)
    } catch (e) {
      console.error('Auth callback exception:', e)
    }
  }

  return NextResponse.redirect(new URL('/?error=auth-failed', request.url))
}

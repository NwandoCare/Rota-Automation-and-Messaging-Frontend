/**
 * Auth abstraction. MockAuth fakes a signed-in coordinator for development.
 * When the Python backend lands, add a GoogleOidcAuth implementation that
 * runs the real OIDC flow and returns its bearer token from getToken() —
 * nothing else in the app changes.
 */
export interface AuthProvider {
  isSignedIn(): boolean
  signIn(): Promise<void>
  signOut(): void
  getToken(): string | null
}

const SESSION_KEY = 'rotaassist.session'

class MockAuth implements AuthProvider {
  isSignedIn(): boolean {
    return sessionStorage.getItem(SESSION_KEY) !== null
  }

  async signIn(): Promise<void> {
    sessionStorage.setItem(SESSION_KEY, 'mock-token')
  }

  signOut(): void {
    sessionStorage.removeItem(SESSION_KEY)
  }

  getToken(): string | null {
    return sessionStorage.getItem(SESSION_KEY)
  }
}

const instance: AuthProvider = new MockAuth()

export function getAuth(): AuthProvider {
  return instance
}

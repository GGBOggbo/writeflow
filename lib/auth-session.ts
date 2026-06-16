type SafeGetSessionInput<TSession> = {
  headers: Headers;
  getSession: (context: { headers: Headers }) => Promise<TSession>;
};

export async function safeGetSession<TSession>({
  headers,
  getSession,
}: SafeGetSessionInput<TSession>): Promise<TSession | null> {
  try {
    return await getSession({ headers });
  } catch {
    return null;
  }
}

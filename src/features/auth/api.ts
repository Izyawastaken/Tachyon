export interface AuthSession {
  profile: { id: string; name: string };
  provider: "mock-microsoft";
}

export interface AuthClient {
  signIn(options: { signal: AbortSignal }): Promise<AuthSession>;
  signOut(session: AuthSession, options: { signal: AbortSignal }): Promise<void>;
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException("Sign-in cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

// Replace this adapter with Rust-backed authentication. A mock session must
// never be treated as a Minecraft entitlement or authorize a game launch.
export const mockAuthClient: AuthClient = {
  async signIn({ signal }) {
    await delay(1000, signal);
    return { profile: { id: "tachyon-demo", name: "TachyonPlayer" }, provider: "mock-microsoft" };
  },
  async signOut(_session, { signal }) {
    await delay(250, signal);
  },
};

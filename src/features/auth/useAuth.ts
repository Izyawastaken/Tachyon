import { useCallback, useEffect, useRef, useState } from "react";
import { mockAuthClient, type AuthClient, type AuthSession } from "./api";

interface AuthState {
  status: "signed-out" | "signing-in" | "signed-in" | "signing-out";
  session: AuthSession | null;
  error: string | null;
}

export function useAuth(client: AuthClient = mockAuthClient) {
  const [state, setState] = useState<AuthState>({ status: "signed-out", session: null, error: null });
  const pending = useRef<{ kind: "sign-in" | "sign-out"; controller: AbortController } | null>(null);

  useEffect(() => () => {
    pending.current?.controller.abort();
    pending.current = null;
  }, []);

  const cancelSignIn = useCallback(() => {
    if (pending.current?.kind !== "sign-in") return;
    pending.current.controller.abort();
    pending.current = null;
    setState({ status: "signed-out", session: null, error: null });
  }, []);

  const signIn = useCallback(async () => {
    if (pending.current || state.session) return;
    const controller = new AbortController();
    pending.current = { kind: "sign-in", controller };
    setState({ status: "signing-in", session: null, error: null });
    try {
      const session = await client.signIn({ signal: controller.signal });
      if (!controller.signal.aborted) setState({ status: "signed-in", session, error: null });
    } catch {
      if (!controller.signal.aborted) setState({ status: "signed-out", session: null, error: "Couldn't sign in. Please try again." });
    } finally {
      if (pending.current?.controller === controller) pending.current = null;
    }
  }, [client, state.session]);

  const signOut = useCallback(async () => {
    if (pending.current || !state.session) return;
    const session = state.session;
    const controller = new AbortController();
    pending.current = { kind: "sign-out", controller };
    setState({ status: "signing-out", session, error: null });
    try {
      await client.signOut(session, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ status: "signed-out", session: null, error: null });
    } catch {
      if (!controller.signal.aborted) setState({ status: "signed-in", session, error: "Couldn't sign out. Please try again." });
    } finally {
      if (pending.current?.controller === controller) pending.current = null;
    }
  }, [client, state.session]);

  return { ...state, signIn, cancelSignIn, signOut };
}

export type AuthController = ReturnType<typeof useAuth>;

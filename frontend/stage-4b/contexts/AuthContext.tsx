"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as api from "@/lib/api";
import * as keyStore from "@/lib/keyStore";
import { deriveWrappingKey, unwrapPrivateKey } from "@/lib/crypto";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  publicKey: string;
  wrappedPrivateKey: string;
  pbkdf2Salt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  privateKey: CryptoKey | null;
  isLoading: boolean;
  isLocked: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  setUser: (user: AuthUser, privateKey: CryptoKey) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // On mount: check if we have a stored session
  useEffect(() => {
    const init = async () => {
      try {
        const stored = await keyStore.loadAnySession();
        const accessToken = api.getAccessToken();
        if (stored && accessToken) {
          // Session exists but private key is not in memory (page refresh)
          setUserState({
            id: stored.userId,
            username: stored.username,
            displayName: stored.displayName,
            publicKey: stored.publicKey,
            wrappedPrivateKey: stored.wrappedPrivateKey,
            pbkdf2Salt: stored.pbkdf2Salt,
          });
          setIsLocked(true);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const setUser = useCallback((u: AuthUser, pk: CryptoKey) => {
    setUserState(u);
    setPrivateKey(pk);
    setIsLocked(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.login(username, password);
      api.storeTokens(res.access_token, res.refresh_token);

      const wrappingKey = await deriveWrappingKey(
        password,
        res.user.pbkdf2_salt
      );
      const pk = await unwrapPrivateKey(
        res.user.wrapped_private_key,
        wrappingKey
      );

      const authUser: AuthUser = {
        id: res.user.id,
        username: res.user.username,
        displayName: res.user.display_name,
        publicKey: res.user.public_key,
        wrappedPrivateKey: res.user.wrapped_private_key,
        pbkdf2Salt: res.user.pbkdf2_salt,
      };

      await keyStore.saveSession({
        userId: res.user.id,
        username: res.user.username,
        displayName: res.user.display_name,
        publicKey: res.user.public_key,
        wrappedPrivateKey: res.user.wrapped_private_key,
        pbkdf2Salt: res.user.pbkdf2_salt,
      });

      setUser(authUser, pk);
    },
    [setUser]
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!user) throw new Error("No session to unlock");
      const wrappingKey = await deriveWrappingKey(password, user.pbkdf2Salt);
      const pk = await unwrapPrivateKey(user.wrappedPrivateKey, wrappingKey);
      setPrivateKey(pk);
      setIsLocked(false);
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      const rt = api.getRefreshToken();
      if (rt) await api.logout(rt);
    } catch {
      // ignore
    }
    api.clearTokens();
    await keyStore.clearSession();
    setUserState(null);
    setPrivateKey(null);
    setIsLocked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        privateKey,
        isLoading,
        isLocked,
        login,
        logout,
        unlock,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

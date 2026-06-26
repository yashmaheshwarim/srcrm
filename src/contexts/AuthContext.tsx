import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, UserRole } from "@/types";
import {
  getCurrentUser,
  setCurrentUser,
  getUserByUsername,
  seedDemoData,
} from "@/lib/data-service";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isAdmin: boolean;
  isJobber: boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    seedDemoData();
    const current = getCurrentUser();
    setUserState(current);
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const found = getUserByUsername(username);
    if (!found) {
      return { success: false, error: "User not found" };
    }
    if (found.password !== password) {
      return { success: false, error: "Invalid password" };
    }
    if (found.status !== "active") {
      return { success: false, error: "Account is inactive" };
    }
    const updated = { ...found, lastLoginAt: new Date().toISOString() };
    setCurrentUser(updated);
    setUserState(updated);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setUserState(null);
  };

  const isAdmin = user?.role === "admin";
  const isJobber = user?.role === "jobber";
  const hasRole = (role: UserRole) => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, isJobber, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
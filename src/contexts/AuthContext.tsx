import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, UserRole } from "@/types";
import { getCurrentUser, setCurrentUser, getUserByUsername, getUsers } from "@/lib/data-service";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isJobber: boolean;
  isPartner: boolean;
  hasRole: (role: UserRole) => boolean;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    Promise.all([
      getUsers(),
      new Promise<User | null>((resolve) => {
        const current = getCurrentUser();
        if (current) {
          getUserByUsername(current.username).then(resolve).catch(() => resolve(current));
        } else {
          resolve(null);
        }
      }),
    ]).then(([usersList, userRecord]) => {
      setAllUsers(usersList);
      if (userRecord && userRecord.status === "active") {
        setUserState(userRecord);
        setCurrentUser(userRecord);
      } else if (userRecord && userRecord.status !== "active") {
        setCurrentUser(null);
        setUserState(null);
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const found = await getUserByUsername(username);
      if (!found) {
        return { success: false, error: "User not found" };
      }
      if (found.password !== password) {
        return { success: false, error: "Invalid password" };
      }
      if (found.status !== "active") {
        return { success: false, error: "Account is inactive" };
      }
      setCurrentUser(found);
      setUserState(found);
      return { success: true };
    } catch {
      return { success: false, error: "Login failed. Is Supabase configured?" };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setUserState(null);
  };

  const isAdmin = user?.role === "admin";
  const isJobber = user?.role === "jobber";
  const isPartner = user?.role === "partner";
  const hasRole = (role: UserRole) => user?.role === role;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, isJobber, isPartner, hasRole, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
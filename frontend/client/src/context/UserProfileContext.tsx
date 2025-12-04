import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { UserProfile } from "@/lib/types";

interface UserProfileContextValue {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

const USER_PROFILE_KEY = "cs_user_profile_v2";

const defaultProfile: UserProfile = {
  id: "user-1",
  firstName: "Alex",
  lastName: "Johnson",
  age: 42,
  bloodType: "O+",
  weightKg: 75,
  heightCm: 175,
};

function loadInitialProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || typeof parsed !== "object") return defaultProfile;
    return { ...defaultProfile, ...parsed };
  } catch {
    return defaultProfile;
  }
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => loadInitialProfile());

  useEffect(() => {
    try {
      window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
    }),
    [profile],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within a UserProfileProvider");
  return ctx;
}

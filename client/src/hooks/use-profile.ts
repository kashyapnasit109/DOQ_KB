import { useState, useCallback } from "react";

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

const PROFILE_KEY = "docq_user_session";

export function useUserProfile() {
  const [profile, setProfileState] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setProfile = useCallback((p: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfileState(p);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY);
    setProfileState(null);
  }, []);

  return { profile, setProfile, clearProfile, isLoggedIn: !!profile };
}

import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type { UserModel } from '../types';

interface AuthStoreState {
  user: UserModel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  initialize: () => () => void;
  setUser: (user: UserModel | null) => void;
  setError: (error: string | null) => void;
  
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to allow session restoration
  error: null,

  initialize: () => {
    // Set up Firebase auth state change listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Attempt to load profile from Firestore
          const userProfile = await userService.getUser(firebaseUser.uid);
          if (userProfile) {
            set({ user: userProfile, isAuthenticated: true, isLoading: false, error: null });
          } else {
            // Fallback user if document is not found or still loading
            const fallbackUser: UserModel = {
              uid: firebaseUser.uid,
              fullName: firebaseUser.displayName || 'LifeOS User',
              email: firebaseUser.email || '',
              photoUrl: firebaseUser.photoURL || undefined,
              provider: firebaseUser.providerData[0]?.providerId || 'password',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              theme: 'dark',
              onboardingCompleted: false,
              college: 'LifeOS University',
            };
            set({ user: fallbackUser, isAuthenticated: true, isLoading: false, error: null });
          }
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      } catch (err: any) {
        console.error('Auth state change handler error:', err);
        set({ user: null, isAuthenticated: false, isLoading: false, error: err.message });
      }
    });

    return unsubscribe;
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setError: (error) => set({ error }),

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signInWithEmailAndPassword(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signUpWithEmail: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUpWithEmailAndPassword(email, password, fullName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signInWithGoogle();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  resetPassword: async (email) => {
    set({ error: null });
    try {
      await authService.sendPasswordResetEmail(email);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  sendVerification: async () => {
    set({ error: null });
    try {
      await authService.sendEmailVerification();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));

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
  isInitializing: boolean;
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
  isInitializing: true, // Start as initializing to allow session restoration
  isLoading: false,     // Action submission loading (Sign In / Sign Up)
  error: null,

  initialize: () => {
    // Set up Firebase auth state change listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Immediately authenticate user with fallback profile from Auth token
          const fallbackUser: UserModel = {
            uid: firebaseUser.uid,
            fullName: firebaseUser.displayName || 'LifeOS User',
            email: firebaseUser.email || '',
            provider: firebaseUser.providerData[0]?.providerId || 'password',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            theme: 'dark',
            onboardingCompleted: false,
            college: 'LifeOS University',
          };
          if (firebaseUser.photoURL) {
            fallbackUser.photoUrl = firebaseUser.photoURL;
          }

          set({ user: fallbackUser, isAuthenticated: true, isInitializing: false, error: null });

          // Load full profile from Firestore asynchronously in the background
          userService.getUser(firebaseUser.uid)
            .then((userProfile) => {
              if (userProfile) {
                set({ user: userProfile });
              }
            })
            .catch((err) => {
              console.error('Background user profile load error:', err);
            });
        } else {
          set({ user: null, isAuthenticated: false, isInitializing: false, error: null });
        }
      } catch (err: any) {
        console.error('Auth state change handler error:', err);
        set({ user: null, isAuthenticated: false, isInitializing: false, error: err.message });
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

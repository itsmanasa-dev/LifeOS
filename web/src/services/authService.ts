import {
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  sendEmailVerification as fbSendEmailVerification,
  signOut as fbSignOut,
  updateProfile,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { UserCredential } from 'firebase/auth';
import { auth } from '../firebase/config';
import { userService } from './userService';
import type { UserModel } from '../types';

export const authService = {
  async signInWithEmailAndPassword(email: string, password: string): Promise<UserModel> {
    const credential = await fbSignInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;

    let user = await userService.getUser(firebaseUser.uid);
    if (!user) {
      user = {
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName || 'LifeOS User',
        email: firebaseUser.email || '',
        provider: 'password',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        theme: 'dark',
        onboardingCompleted: false,
        college: 'LifeOS University',
      };
      if (firebaseUser.photoURL) {
        user.photoUrl = firebaseUser.photoURL;
      }
      await userService.saveUser(user);
    } else {
      user.lastLogin = new Date().toISOString();
      await userService.saveUser(user);
    }
    return user;
  },

  async signUpWithEmailAndPassword(email: string, password: string, fullName: string): Promise<UserModel> {
    const credential = await fbCreateUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;
    
    // Update display name in Firebase Auth
    await updateProfile(firebaseUser, { displayName: fullName });

    const user: UserModel = {
      uid: firebaseUser.uid,
      fullName: fullName,
      email: email,
      provider: 'password',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      theme: 'dark',
      onboardingCompleted: false,
      college: 'LifeOS University',
    };
    if (firebaseUser.photoURL) {
      user.photoUrl = firebaseUser.photoURL;
    }

    await userService.saveUser(user);
    return user;
  },

  async signInWithGoogle(): Promise<UserModel> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const credential = await signInWithPopup(auth, provider);
    const firebaseUser = credential.user;

    let user = await userService.getUser(firebaseUser.uid);
    if (!user) {
      user = {
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName || 'LifeOS User',
        email: firebaseUser.email || '',
        provider: 'google',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        theme: 'dark',
        onboardingCompleted: false,
        college: 'LifeOS University',
      };
      if (firebaseUser.photoURL) {
        user.photoUrl = firebaseUser.photoURL;
      }
      await userService.saveUser(user);
    } else {
      user.lastLogin = new Date().toISOString();
      user.fullName = firebaseUser.displayName || user.fullName;
      if (firebaseUser.photoURL) {
        user.photoUrl = firebaseUser.photoURL;
      }
      await userService.saveUser(user);
    }
    return user;
  },

  async sendPasswordResetEmail(email: string): Promise<void> {
    await fbSendPasswordResetEmail(auth, email);
  },

  async sendEmailVerification(): Promise<void> {
    if (auth.currentUser) {
      await fbSendEmailVerification(auth.currentUser);
    } else {
      throw new Error('No authenticated user found.');
    }
  },

  async signOut(): Promise<void> {
    await fbSignOut(auth);
  },
};
export type { UserCredential };

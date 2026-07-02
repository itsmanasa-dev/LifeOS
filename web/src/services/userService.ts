import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { UserModel } from '../types';

export const userService = {
  async getUser(uid: string): Promise<UserModel | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserModel;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  },

  async saveUser(user: UserModel): Promise<void> {
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, user, { merge: true });
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  },
};

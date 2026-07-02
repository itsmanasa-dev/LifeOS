export interface UserModel {
  uid: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  provider: string;
  createdAt: string;
  lastLogin: string;
  theme: string;
  onboardingCompleted: boolean;
  college?: string;
}

export interface UserState {
  user: UserModel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

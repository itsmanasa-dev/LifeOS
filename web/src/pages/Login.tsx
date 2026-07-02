import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Flame, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await signInWithEmail(data.email, data.password);
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Logged in with Google!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Google authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 bg-workspace relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="p-1.5 bg-primary/10 rounded-lg border border-accent/20">
              <Flame className="w-8 h-8 text-accent animate-pulse" />
            </div>
            <h1 className="text-3.5xl font-black tracking-tight text-white m-0 leading-none">LifeOS</h1>
          </div>
          <span className="text-xs text-dark-text-secondary font-bold uppercase tracking-wider">
            Ultimate Productivity Workspace
          </span>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 border border-slate-800/60 shadow-2xl relative">
          <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
          <p className="text-sm text-dark-text-secondary mb-6">
            Sign in to sync your local schedule & habits.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={`w-full pl-12 pr-4 py-3.5 input-field ${
                    errors.email ? 'border-error focus:border-error focus:shadow-none' : ''
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-error font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-dark-text-secondary uppercase">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-accent font-bold hover:underline cursor-pointer"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full pl-12 pr-12 py-3.5 input-field ${
                    errors.password ? 'border-error focus:border-error' : ''
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-error font-medium mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-200 shadow-lg shadow-primary/20 mt-4 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Social Separator */}
          <div className="my-6 flex items-center justify-between">
            <hr className="w-full border-slate-800" />
            <span className="text-xs text-dark-text-secondary px-3 shrink-0">or continue with</span>
            <hr className="w-full border-slate-800" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full border border-slate-800 bg-transparent hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.png"
              alt="Google"
              className="w-4 h-4"
            />
            <span className="text-sm">Continue with Google</span>
          </button>
        </div>

        {/* Create Account footer */}
        <p className="text-center text-sm text-dark-text-secondary mt-8">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-accent font-bold hover:underline cursor-pointer"
            disabled={isLoading}
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;

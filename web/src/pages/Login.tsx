import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
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
  const [showEmailForm, setShowEmailForm] = useState(false);

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
      console.error("Google Sign-In Error:", err);
      if (err && typeof err === 'object') {
        console.error(err.code);
        console.error(err.message);
      }
      toast.error(err.message || 'Google authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo and Tagline */}
        <div className="flex flex-col items-center mb-10 text-center">
          <img
            src="/logo.png"
            alt="LifeOS Logo"
            className="w-28 h-28 rounded-[28px] shadow-2xl mb-6 object-cover"
          />
          <p className="text-sm text-zinc-400 font-medium tracking-wide">
            The operating system for your life.
          </p>
        </div>

        {/* Action Panel */}
        <div className="w-full space-y-4">
          {!showEmailForm ? (
            <>
              {/* Sign in with Email */}
              <button
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold py-4 px-4 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/10 disabled:opacity-50"
              >
                <Mail className="w-5 h-5" />
                <span className="text-[15px]">Sign in with Email</span>
              </button>

              {/* Continue with Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full border border-zinc-800 bg-transparent hover:bg-zinc-900 text-white font-semibold py-4 px-4 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <img
                  src="/google.svg"
                  alt="Google"
                  className="w-4 h-4"
                />
                <span className="text-[15px]">Continue with Google</span>
              </button>

              {/* Register link */}
              <p className="text-center text-sm text-zinc-500 mt-6 w-full">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-500 font-semibold hover:underline cursor-pointer"
                  disabled={isLoading}
                >
                  Create Account
                </button>
              </p>
            </>
          ) : (
            <form className="space-y-5 w-full" onSubmit={handleSubmit(onSubmit)}>
              {/* Back Button */}
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="flex items-center text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider mb-2 cursor-pointer transition-colors"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>

              {/* Email Field */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    className={`w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm ${
                      errors.email ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-blue-500 font-bold hover:underline cursor-pointer"
                    disabled={isLoading}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full pl-12 pr-12 py-3.5 bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm ${
                      errors.password ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium mt-1.5">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

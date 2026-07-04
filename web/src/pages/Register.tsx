import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { signUpWithEmail, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await signUpWithEmail(data.email, data.password, data.fullName);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register account.');
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
          <form className="space-y-5 w-full" onSubmit={handleSubmit(onSubmit)}>
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider mb-2 cursor-pointer transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            {/* Name Field */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Alex Chen"
                  {...register('fullName')}
                  className={`w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm ${
                    errors.fullName ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-red-500 font-medium mt-1.5">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Email Address
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
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  {...register('password')}
                  className={`w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm ${
                    errors.password ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  disabled={isLoading}
                />
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
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <span>Create Workspace</span>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-zinc-500 mt-6 w-full">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-500 font-semibold hover:underline cursor-pointer bg-transparent border-none p-0 inline-block animate-none"
              disabled={isLoading}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

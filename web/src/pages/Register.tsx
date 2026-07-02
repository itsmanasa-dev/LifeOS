import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Flame, Mail, Lock, User, Loader2 } from 'lucide-react';
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
          <h2 className="text-2xl font-bold text-white mb-1.5">Create Account</h2>
          <p className="text-sm text-dark-text-secondary mb-6">
            Build your local timetable & tracking database.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type="text"
                  placeholder="Alex Chen"
                  {...register('fullName')}
                  className={`w-full pl-12 pr-4 py-3.5 input-field ${
                    errors.fullName ? 'border-error focus:border-error' : ''
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-error font-medium mt-1.5">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={`w-full pl-12 pr-4 py-3.5 input-field ${
                    errors.email ? 'border-error focus:border-error' : ''
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
              <label className="block text-xs font-bold text-dark-text-secondary uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  {...register('password')}
                  className={`w-full pl-12 pr-4 py-3.5 input-field ${
                    errors.password ? 'border-error focus:border-error' : ''
                  }`}
                  disabled={isLoading}
                />
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
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <span>Create Workspace</span>
              )}
            </button>
          </form>
        </div>

        {/* Redirect to Login */}
        <p className="text-center text-sm text-dark-text-secondary mt-8">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-accent font-bold hover:underline cursor-pointer"
            disabled={isLoading}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;

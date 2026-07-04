import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setSubmitting(true);
    try {
      await resetPassword(data.email);
      toast.success('Password reset email sent. Check your inbox!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setSubmitting(false);
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
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

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
                  disabled={submitting}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Reset Instructions</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

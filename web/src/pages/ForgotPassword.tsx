import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/useAuthStore';
import { Flame, Mail, ArrowLeft, Loader2 } from 'lucide-react';
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
          <h2 className="text-2xl font-bold text-white mb-1.5">Recover Password</h2>
          <p className="text-sm text-dark-text-secondary mb-6">
            Enter your email to request recovery link.
          </p>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
                  disabled={submitting}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-error font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-200 shadow-lg shadow-primary/20 mt-4 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
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

        {/* Redirect back to Login */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center space-x-2 text-accent font-bold hover:underline cursor-pointer"
            disabled={submitting}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to login</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

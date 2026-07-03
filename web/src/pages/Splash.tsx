import React from 'react';
import { Flame } from 'lucide-react';

const Splash: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center bg-workspace">
      <div className="text-center flex flex-col items-center">
        {/* Animated logo container */}
        <div className="p-5 bg-primary/10 rounded-full border border-primary/20 mb-6 animate-pulse">
          <Flame className="w-16 h-16 text-accent animate-bounce" />
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">LifeOS</h1>
        <p className="text-sm text-dark-text-secondary font-medium">
          Initializing your workspace...
        </p>
      </div>
    </div>
  );
};

export default Splash;

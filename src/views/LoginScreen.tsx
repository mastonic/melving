
import React, { useState, useEffect } from 'react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onCancel }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const correctPin = '1234';

  const handleKeyPress = (num: string) => {
    setError(false);
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onLoginSuccess();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin]);

  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg shadow-blue-100">
            <i className="fas fa-lock"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Accès Outils</h2>
          <p className="text-slate-500 text-sm mt-1">Saisissez votre code PIN pour continuer</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center space-x-4 mb-10">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                error ? 'border-red-500 bg-red-50 animate-bounce' : 
                pin.length > i ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200'
              }`}
            >
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xl font-bold text-slate-700 border border-slate-100"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={onCancel}
            className="h-16 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 transition-all text-sm font-bold text-slate-400"
          >
            ANNULER
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-xl font-bold text-slate-700 border border-slate-100"
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 transition-all text-xl font-bold text-slate-400"
          >
            <i className="fas fa-backspace"></i>
          </button>
        </div>

        {error && (
          <p className="text-center text-red-500 font-bold text-sm animate-pulse">
            Code PIN incorrect
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;

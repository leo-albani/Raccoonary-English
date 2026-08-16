import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { loginWithGoogle, FirebaseAuthError } from '../services/firebase';
import { getTranslation } from '../i18n/translations';

interface LoginProps {
  onLoginSuccess?: (warningMsg?: string) => void;
  onGuestLogin?: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onGuestLogin, t }) => {
  const tr = (key: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : getTranslation(key, null, params);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setUnauthorizedDomain(null);

    try {
      const result = await loginWithGoogle();
      if (result.warningMessage) {
        setWarningMessage(result.warningMessage);
      }
      if (onLoginSuccess) {
        onLoginSuccess(result.warningMessage);
      }
    } catch (err: any) {
      console.error('Google Login Error:', err);
      if (err instanceof FirebaseAuthError && err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(err.domain || currentHost);
      } else if (err?.message?.includes('unauthorized-domain') || err?.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(currentHost);
      }
      setErrorMessage(err.message || tr('login.loginError'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2E8D5] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6 text-center animate-fade-in">
        {/* Mascot Greeting */}
        <Mascot
          pose={unauthorizedDomain ? 'thinking' : 'greeting'}
          size={140}
          speechBubble={
            warningMessage
              ? warningMessage
              : unauthorizedDomain
              ? 'Manca solo un passaggio su Firebase Console per abilitare questo dominio!'
              : errorMessage
              ? errorMessage
              : tr('login.mascotGreeting')
          }
        />

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <span className="badge-leaf">{tr('login.welcomeBadge')}</span>
          <h1 className="text-3xl font-extrabold text-[#3A2B22] font-display">
            {tr('login.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#3A2B22]/75 max-w-sm mx-auto leading-relaxed">
            {tr('login.subtitle')}
          </p>
        </div>

        {/* Login Button Container */}
        <div className="bento-card p-6 space-y-4 border-2 border-[#6B7C4F]/30 bg-white/80 backdrop-blur-xs">
          {warningMessage && (
            <div className="p-3.5 rounded-2xl bg-[#C99A3D]/15 border border-[#C99A3D]/40 text-left text-xs text-[#3A2B22] font-medium leading-relaxed">
              <span className="font-bold text-[#C99A3D]">⚠️ {tr('login.warningPrefix')}</span> {warningMessage}
            </div>
          )}

          {unauthorizedDomain ? (
            <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-left space-y-3 text-xs text-[#3A2B22]">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <span>🔐</span>
                <span>Dominio da autorizzare su Firebase</span>
              </div>
              <p className="leading-relaxed text-amber-950/85">
                Il nuovo progetto Firebase richiede che questo dominio sia inserito tra i <strong>Domini autorizzati</strong>:
              </p>
              
              {/* Domain Box + Copy Button */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-amber-200 shadow-xs">
                <code className="font-mono font-semibold text-[11px] text-[#3A2B22] truncate select-all">
                  {unauthorizedDomain}
                </code>
                <button
                  onClick={() => copyToClipboard(unauthorizedDomain)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#6B7C4F] text-white hover:bg-[#586740] cursor-pointer shrink-0 transition-colors"
                >
                  {copiedDomain ? '✓ Copiato!' : 'Copia'}
                </button>
              </div>

              {/* Quick instructions */}
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-950/80 leading-relaxed font-medium">
                <li>Apri <strong>Firebase Console</strong> → <strong>Authentication</strong></li>
                <li>Vai nella scheda <strong>Impostazioni (Settings)</strong> → <strong>Domini autorizzati</strong></li>
                <li>Clicca <strong>Aggiungi dominio</strong> e incolla il dominio sopra</li>
              </ol>
            </div>
          ) : errorMessage ? (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-left text-xs text-red-700 font-medium leading-relaxed">
              <span className="font-bold">Oops!</span> {errorMessage}
            </div>
          ) : null}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 px-6 rounded-2xl bg-white text-[#3A2B22] font-extrabold font-display text-base border-2 border-[#3A2B22]/15 shadow-md hover:bg-gray-50 hover:border-[#6B7C4F] cursor-pointer transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#6B7C4F] border-t-transparent rounded-full animate-spin" />
                <span>{tr('login.loggingIn')}</span>
              </div>
            ) : (
              <>
                {/* Google logo SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{tr('login.loginWithGoogle')}</span>
              </>
            )}
          </button>

          {onGuestLogin && (
            <button
              onClick={onGuestLogin}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#6B7C4F] hover:bg-[#6B7C4F]/10 cursor-pointer transition-colors border border-dashed border-[#6B7C4F]/40"
            >
              🐾 Continua come ospite (Modalità locale)
            </button>
          )}
        </div>

        {/* Subtle footer */}
        <p className="text-[11px] text-[#3A2B22]/50 font-medium">
          {tr('login.footer')}
        </p>
      </div>
    </div>
  );
};

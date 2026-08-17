import React, { useState } from 'react';
import { Mascot } from '../mascot/Mascot';
import { loginWithGoogle, FirebaseAuthError } from '../services/firebase';
import { getTranslation } from '../i18n/translations';
import { AmbientForestBackground } from '../components/AmbientForestBackground';

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
    <div className="min-h-screen bg-[#1A1512] text-[#F2E8D5] flex flex-col justify-between p-6 sm:p-8 select-none max-w-lg mx-auto relative overflow-hidden">
      {/* Decorative Forest Background Silhouettes */}
      <AmbientForestBackground />

      {/* Top Header Badge */}
      <header className="text-center pt-2 relative z-10">
        <span className="badge-leaf">{tr('login.welcomeBadge')}</span>
      </header>

      {/* Main Immersive Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-6 space-y-6 animate-fade-in w-full relative z-10">
        <div className="relative">
          <Mascot
            pose={unauthorizedDomain ? 'thinking' : 'greeting'}
            size={160}
            speechBubble={
              warningMessage
                ? warningMessage
                : unauthorizedDomain
                ? 'Manca solo un passaggio per autorizzare questo dominio su Firebase!'
                : errorMessage
                ? errorMessage
                : tr('login.mascotGreeting')
            }
          />
        </div>

        {/* Confident, Bold Typography */}
        <div className="space-y-2 px-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F2E8D5] font-display leading-tight">
            {tr('login.title')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#F2E8D5]/75 max-w-sm mx-auto leading-relaxed">
            {tr('login.subtitle')}
          </p>
        </div>

        {/* Login Action Card with Depth */}
        <div className="bento-card w-full p-6 sm:p-7 space-y-4 border-2 border-[#6B7C4F]/35 bg-[#2B2622] text-[#F2E8D5]">
          {warningMessage && (
            <div className="p-3.5 rounded-2xl bg-[#C99A3D]/20 border border-[#C99A3D]/50 text-left text-xs text-[#F2E8D5] font-medium leading-relaxed">
              <span className="font-bold text-[#E8802F]">⚠️ {tr('login.warningPrefix')}</span> {warningMessage}
            </div>
          )}

          {unauthorizedDomain ? (
            <div className="p-4 rounded-2xl bg-[#1A1512] border-2 border-[#C99A3D]/60 text-left space-y-3 text-xs text-[#F2E8D5]">
              <div className="flex items-center gap-2 font-bold text-[#E8802F] text-sm font-display">
                <span>🔐</span>
                <span>Dominio da autorizzare su Firebase</span>
              </div>
              <p className="leading-relaxed text-[#F2E8D5]/80">
                Il tuo progetto Firebase richiede l'aggiunta di questo dominio tra i <strong>Domini autorizzati</strong>:
              </p>
              
              <div className="flex items-center justify-between gap-2 p-2.5 bg-[#2B2622] rounded-xl border border-[#6B7C4F]/40 shadow-xs">
                <code className="font-mono font-bold text-[11px] text-[#E8802F] truncate select-all">
                  {unauthorizedDomain}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(unauthorizedDomain)}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#6B7C4F] text-[#F2E8D5] hover:bg-[#586740] cursor-pointer shrink-0 transition-colors"
                >
                  {copiedDomain ? '✓ Copiato!' : 'Copia'}
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#F2E8D5]/75 leading-relaxed font-medium">
                <li>Apri <strong>Firebase Console</strong> → <strong>Authentication</strong></li>
                <li>Vai nella scheda <strong>Impostazioni</strong> → <strong>Domini autorizzati</strong></li>
                <li>Clicca <strong>Aggiungi dominio</strong> e incolla il dominio sopra</li>
              </ol>
            </div>
          ) : errorMessage ? (
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-left text-xs text-red-200 font-medium leading-relaxed">
              <span className="font-bold">Oops!</span> {errorMessage}
            </div>
          ) : null}

          {/* Primary Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 px-6 rounded-2xl bg-[#1A1512] text-[#F2E8D5] font-extrabold font-display text-base border-2 border-[#6B7C4F]/40 shadow-md hover:border-[#E8802F] hover:bg-[#201B17] cursor-pointer transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#E8802F] border-t-transparent rounded-full animate-spin" />
                <span>{tr('login.loggingIn')}</span>
              </div>
            ) : (
              <>
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

          {/* Secondary Guest Button */}
          {onGuestLogin && (
            <button
              onClick={onGuestLogin}
              type="button"
              className="btn-secondary w-full py-3 text-xs sm:text-sm"
            >
              🐾 Continua come ospite (Modalità locale)
            </button>
          )}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="text-center pb-2 relative z-10">
        <p className="text-[11px] text-[#F2E8D5]/50 font-medium">
          {tr('login.footer')}
        </p>
      </footer>
    </div>
  );
};
export default Login;

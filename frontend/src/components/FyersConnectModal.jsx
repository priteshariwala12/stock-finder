import React, { useState, useEffect } from 'react';
import { 
  X, Zap, ExternalLink, Copy, Check, AlertTriangle, ShieldCheck, Clock, RefreshCw, KeyRound
} from 'lucide-react';

export default function FyersConnectModal({ isOpen, onClose, onSuccess }) {
  const [statusData, setStatusData] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [authInput, setAuthInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch current Fyers status and auth URL
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/fyers/status', { cache: 'no-store' });
      const data = await res.json();
      setStatusData(data);
    } catch (e) {
      console.error('Failed to fetch Fyers status:', e);
      setStatusData({
        authenticated: false,
        message: 'Could not connect to backend server',
        auth_url: 'https://api-t1.fyers.in/api/v3/generate-authcode?client_id=1RGTQJ79OP-200&redirect_uri=https%3A%2F%2Ftrade.fyers.in%2Fapi-login%2Fredirect-uri%2Findex.html&response_type=code&state=None'
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    setAuthInput('');
    fetchStatus();
  }, [isOpen]);

  // ESC key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const authUrl = statusData?.auth_url || 
    'https://api-t1.fyers.in/api/v3/generate-authcode?client_id=1RGTQJ79OP-200&redirect_uri=https%3A%2F%2Ftrade.fyers.in%2Fapi-login%2Fredirect-uri%2Findex.html&response_type=code&state=None';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(authUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAuthInput(text.trim());
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const handleConnect = async (e) => {
    e?.preventDefault();
    if (!authInput.trim()) {
      setMessage({ type: 'error', text: 'Please paste the redirected URL or auth code first.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/fyers/set-auth-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_code: authInput.trim() })
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setMessage({
          type: 'success',
          text: 'Fyers API connected successfully! Zero-delay live streaming is now active.'
        });
        setAuthInput('');
        fetchStatus();
        onSuccess?.();
        setTimeout(() => {
          onClose?.();
        }, 1800);
      } else {
        setMessage({
          type: 'error',
          text: data.message || data.detail || 'Invalid or expired auth code. Please open the login link and try again.'
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Connection failed: ' + (err.message || 'Network error')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Sync Fyers API Link to Connect</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v3 Zero-Delay
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Enables 0-delay live candlestick charts & 1-second option chain updates
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Status Indicator Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${
                statusData?.authenticated 
                  ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400' 
                  : 'bg-amber-400 animate-ping'
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Status:</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${
                    statusData?.authenticated
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {statusData?.authenticated ? 'CONNECTED & LIVE' : 'TOKEN EXPIRED / NOT CONNECTED'}
                  </span>
                </div>
                {statusData?.authenticated && statusData?.name && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Logged in as: <strong className="text-slate-200">{statusData.name}</strong>
                  </p>
                )}
                {statusData?.expires_at && (
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Valid until: {statusData.expires_at}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={fetchStatus}
              disabled={isLoadingStatus}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Refresh Fyers Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="text-[11px]">Check Status</span>
            </button>
          </div>

          {/* Explanation Alert */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-slate-300 text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SEBI Daily Renewal Requirement</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Indian exchange regulations (SEBI) require daily broker token renewal at 06:00 AM IST. Connect in 2 simple steps below:
            </p>
          </div>

          {/* STEP 1: Open Fyers Login Link */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Open Official Fyers Login Link
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 transition-all"
                title="Copy Fyers Login URL"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click the button below to open Fyers login in a new tab. Log in with your Fyers credentials (Mobile / TOTP / PIN). After login, Fyers will redirect to a page with your <code className="text-amber-300 font-mono">auth_code</code> in the address bar.
            </p>

            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-950" />
              <span>1. Click Here to Open Fyers Login Page (New Tab)</span>
            </a>
          </div>

          {/* STEP 2: Paste Redirect Link or Auth Code */}
          <form onSubmit={handleConnect} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Paste Redirected URL or Auth Code
                </h3>
              </div>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 transition-all"
                title="Paste from Clipboard"
              >
                <KeyRound className="w-3 h-3 text-indigo-400" />
                <span>Paste</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Copy the address bar URL from the redirected page (or just the code) and paste it below:
            </p>

            <div className="relative">
              <input
                type="text"
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                placeholder="https://trade.fyers.in/api-login/redirect-uri/index.html?auth_code=... or raw code"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            {/* Notification / Feedback Banner */}
            {message && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
              }`}>
                {message.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !authInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting & Syncing Fyers API...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>2. Connect & Sync Fyers API</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Official Fyers API v3 Integration</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

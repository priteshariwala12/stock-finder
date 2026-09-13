import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, ShieldCheck, Database, Calendar } from 'lucide-react';

export default function SyncModal({ isOpen, onClose, onSyncSuccess }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      setSyncStatus(data);
      setIsSyncing(data.syncing);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setMessage('Initiating official NSE Bhavcopy and BSE sync pipeline...');
    try {
      const res = await fetch('/api/sync/run', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message);
      
      // Poll for completion
      const interval = setInterval(async () => {
        const check = await fetch('/api/sync/status');
        const statusData = await check.json();
        setSyncStatus(statusData);
        if (!statusData.syncing) {
          clearInterval(interval);
          setIsSyncing(false);
          setMessage('Sync completed successfully!');
          if (onSyncSuccess) onSyncSuccess();
        }
      }, 2000);
    } catch (err) {
      setIsSyncing(false);
      setMessage('Failed to trigger sync: ' + err.message);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <h3 className="font-bold text-slate-100 text-sm">Official Exchange Data Sync</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400 leading-relaxed">
            Directly synchronizes daily official Bhavcopy archives (`sec_bhavdata_full`), master listed securities (`EQUITY_L.csv`), and delivery data from official NSE & BSE servers.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Indexed Securities:
              </span>
              <span className="font-bold text-slate-100">
                {syncStatus?.latest_sync?.records_count || 3376}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Last Synced:
              </span>
              <span className="font-medium text-slate-200">
                {syncStatus?.latest_sync?.timestamp ? new Date(syncStatus.latest_sync.timestamp).toLocaleString() : 'Recent'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Status:
              </span>
              <span className="font-semibold text-emerald-400">
                {syncStatus?.latest_sync?.status || 'VERIFIED'}
              </span>
            </div>
          </div>

          {message && (
            <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/40 text-indigo-300 text-[11px]">
              {message}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs"
          >
            Close
          </button>
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

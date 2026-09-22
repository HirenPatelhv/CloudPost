import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    // Clear faulty active tab or temporary state if needed
    try {
      localStorage.removeItem('cp_active_tab_id');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleRecoverSafeState = () => {
    try {
      // Clear corrupt workspace cache while keeping user data safe
      localStorage.removeItem('cp_tabs');
      localStorage.removeItem('cp_active_tab_id');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0e111a] text-zinc-200 flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-lg w-full bg-[#141824] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight">Application Render Notice</h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                An unexpected interface state occurred. CloudPost has preserved your saved collections and workspace data safely.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#0a0c12] border border-white/5 rounded-lg text-left text-[11px] font-mono text-rose-300 max-h-32 overflow-auto break-all">
                {this.state.error.message || 'Unknown render exception'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleRecoverSafeState}
                className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-zinc-400" />
                <span>Restore Safe Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

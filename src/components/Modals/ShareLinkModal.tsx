import React, { useState, useEffect } from 'react';
import { ApiRequest, Collection, Workspace } from '../../types';
import { APP_BASE_URL, getApiUrl } from '../../config';
import { 
  Share2, 
  Link as LinkIcon, 
  Check, 
  Copy, 
  Globe, 
  Lock, 
  Terminal, 
  Layers, 
  Download,
  CheckCircle2,
  Info,
  Sparkles,
  Zap,
  Loader2
} from 'lucide-react';
import { generateCurl } from '../../services/codeGenService';
import { 
  exportCollectionToPostmanV2, 
  exportCloudPostCollection, 
  downloadJsonFile 
} from '../../services/importExportService';

export interface ShareLinkModalProps {
  type: 'request' | 'collection';
  request?: ApiRequest;
  collection?: Collection;
  workspace?: Workspace;
  onClose: () => void;
  onUpdateCollectionSharing?: (collectionId: string, isEnabled: boolean, shareToken?: string) => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  type,
  request,
  collection,
  workspace,
  onClose,
  onUpdateCollectionSharing,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPostmanLink, setCopiedPostmanLink] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isSharingEnabled, setIsSharingEnabled] = useState<boolean>(() => {
    if (type === 'collection' && collection) {
      return collection.isLinkSharingEnabled ?? true;
    }
    return true;
  });

  const [shareToken, setShareToken] = useState<string>(() => {
    if (type === 'collection' && collection) {
      return collection.shareToken || `col_share_${Math.random().toString(36).substring(2, 10)}`;
    }
    return `req_share_${Math.random().toString(36).substring(2, 10)}`;
  });

  const origin = APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://cloudpost.techvisionstudio.in');
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const baseUrl = origin + (path.endsWith('/') ? path : path + '/');

  // Short link states
  const [shortUrl, setShortUrl] = useState<string>('');
  const [shortPostmanUrl, setShortPostmanUrl] = useState<string>('');
  const [isGeneratingShortLink, setIsGeneratingShortLink] = useState<boolean>(true);

  // Automatically generate and publish concise short-link
  useEffect(() => {
    let isMounted = true;
    setIsGeneratingShortLink(true);

    const publishShortLink = async () => {
      try {
        let payload: any = null;
        let title = 'Shared API';

        if (type === 'collection' && collection) {
          title = collection.name;
          payload = {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            requests: collection.requests || [],
            folders: collection.folders || []
          };
        } else if (type === 'request' && request) {
          title = request.name;
          payload = {
            id: request.id,
            name: request.name,
            method: request.method,
            url: request.url,
            headers: (request.headers || []).filter(h => h && h.enabled && h.key),
            params: (request.params || []).filter(p => p && p.enabled && p.key),
            body: request.body,
            auth: request.auth
          };
        }

        if (!payload) {
          if (isMounted) setIsGeneratingShortLink(false);
          return;
        }

        const res = await fetch(getApiUrl('/api/share/publish'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            title,
            data: payload
          })
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success && isMounted) {
            const shortCode = resData.shortCode || resData.shareId;
            setShortUrl(resData.cleanShortUrl || resData.shortUrl || `${origin}/?s=${shortCode}`);
            setShortPostmanUrl(resData.postmanImportUrl || `${origin}/api/share/postman/${shortCode}`);
          }
        }
      } catch (err) {
        console.warn('Could not reach share publish API, using compact hash fallback:', err);
      } finally {
        if (isMounted) setIsGeneratingShortLink(false);
      }
    };

    publishShortLink();

    return () => {
      isMounted = false;
    };
  }, [type, collection?.id, request?.id]);

  const handleToggleSharing = () => {
    const nextState = !isSharingEnabled;
    setIsSharingEnabled(nextState);
    if (type === 'collection' && collection && onUpdateCollectionSharing) {
      onUpdateCollectionSharing(collection.id, nextState, shareToken);
    }
  };

  // Compact fallback URLs if offline or server pending
  const fallbackCode = type === 'collection' ? (collection?.id || 'col') : (request?.id || 'req');
  const shareUrl = shortUrl || `${origin}/?s=${fallbackCode}`;
  const postmanImportUrl = shortPostmanUrl || `${origin}/api/share/postman/${fallbackCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPostmanLink = () => {
    navigator.clipboard.writeText(postmanImportUrl);
    setCopiedPostmanLink(true);
    setTimeout(() => setCopiedPostmanLink(false), 2000);
  };

  const handleCopyCurl = () => {
    if (!request) return;
    const curl = generateCurl(request, []);
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleDownloadPostmanJson = () => {
    if (type === 'collection' && collection) {
      const pmData = exportCollectionToPostmanV2(collection);
      downloadJsonFile(`${collection.name.toLowerCase().replace(/\s+/g, '_')}.postman_collection.json`, pmData);
    } else if (type === 'request' && request) {
      const tempCol: Collection = {
        id: 'col_export_' + request.id,
        workspaceId: workspace?.id || 'ws_default',
        name: `Export - ${request.name}`,
        folders: [],
        requests: [request],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const pmData = exportCollectionToPostmanV2(tempCol);
      downloadJsonFile(`${request.name.toLowerCase().replace(/\s+/g, '_')}.postman_collection.json`, pmData);
    }
  };

  const handleDownloadCloudPostJson = () => {
    if (type === 'collection' && collection) {
      const cpData = exportCloudPostCollection(collection);
      downloadJsonFile(`${collection.name.toLowerCase().replace(/\s+/g, '_')}.cloudpost.json`, cpData);
    } else if (type === 'request' && request) {
      const cpData = {
        format: 'cloudpost_request',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        request
      };
      downloadJsonFile(`${request.name.toLowerCase().replace(/\s+/g, '_')}.cloudpost.json`, cpData);
    }
  };

  const totalEndpoints = collection 
    ? collection.requests.length + collection.folders.reduce((acc, f) => acc + f.requests.length, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-[#141824] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#181d2c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">
                {type === 'request' ? 'Share API Request' : 'Share API Collection'}
              </h2>
              <p className="text-xs text-zinc-400">
                {type === 'request'
                  ? `Request: ${request?.name || 'HTTP Endpoint'}`
                  : `Collection: ${collection?.name} (${totalEndpoints} endpoints)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Enable / Disable Link Sharing Toggle for Collections */}
          {type === 'collection' && (
            <div className="p-4 rounded-xl bg-[#0e111a] border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSharingEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                  {isSharingEnabled ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Public Link Sharing</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSharingEnabled 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {isSharingEnabled ? 'ACTIVE & SHARABLE' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {isSharingEnabled 
                      ? 'Anyone with the unique link can preview and import this collection into their workspace.' 
                      : 'Link sharing is turned off. Only members of this workspace can view this collection.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSharing}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSharingEnabled ? 'bg-orange-500' : 'bg-zinc-700'
                }`}
                title={isSharingEnabled ? 'Disable link sharing' : 'Enable link sharing'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isSharingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Request Header Summary */}
          {type === 'request' && request && (
            <div className="p-3.5 rounded-xl bg-[#0e111a] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  request.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                  request.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' :
                  request.method === 'PUT' ? 'bg-amber-500/20 text-amber-400' :
                  request.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {request.method}
                </span>
                <span className="text-xs text-white font-mono truncate">{request.url}</span>
              </div>
              <button
                onClick={handleCopyCurl}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                title="Copy as cURL command"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-orange-400" />}
                <span>{copiedCurl ? 'cURL Copied' : 'Copy cURL'}</span>
              </button>
            </div>
          )}

          {isSharingEnabled ? (
            <div className="space-y-4">
              {/* 1. CloudPost Short Deep Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    CloudPost Short Share Link
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Short URL (Compact)
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full bg-[#0d1017] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none select-all truncate"
                    />
                    {isGeneratingShortLink && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                        Generating...
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-semibold text-white rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Concise short link with zero URL bloat. Opens instantly in React, Desktop, or PHP apps.
                </p>
              </div>

              {/* 2. Postman Direct Import URL (Raw JSON) */}
              <div className="space-y-1.5 p-3.5 bg-gradient-to-br from-orange-500/5 to-amber-500/5 rounded-xl border border-orange-500/20">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Postman Direct Import Link (Short)
                  </label>
                  <span className="text-[10px] text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 font-mono font-semibold">
                    Import → Link in Postman
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-orange-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      readOnly
                      value={postmanImportUrl}
                      className="w-full bg-[#0d1017] border border-orange-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-orange-200 font-mono focus:outline-none select-all truncate"
                    />
                  </div>
                  <button
                    onClick={handleCopyPostmanLink}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-semibold text-white rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shrink-0 cursor-pointer"
                  >
                    {copiedPostmanLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPostmanLink ? 'Copied!' : 'Copy Postman Link'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>In Postman, click <strong>Import → Link</strong> and paste this short URL to directly import!</span>
                </p>
              </div>

              {/* 3. Export & Download Files */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Direct JSON File Downloads:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPostmanJson}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    <span>Download Postman v2.1 JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCloudPostJson}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-xs font-medium transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download CloudPost Custom JSON</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Public Link Access is Disabled</span>
                <span className="text-[11px] text-amber-300/80">
                  Toggle on &quot;Public Link Sharing&quot; above to generate active links for Postman and CloudPost.
                </span>
              </div>
            </div>
          )}

          {/* Quick Security Badge */}
          <div className="p-3 bg-[#0e111a] border border-white/5 rounded-xl text-xs space-y-1 text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Security & Secrets:</span>
              <span className="text-zinc-200 font-medium">Environment variables remain private</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Postman Compatibility:</span>
              <span className="text-emerald-400 font-medium">Official Postman v2.1.0 Collection Schema</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#181d2c] border-t border-white/10 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

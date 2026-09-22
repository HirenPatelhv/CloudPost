import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Send,
  FolderTree,
  Variable,
  Play,
  FileCode,
  Layers,
  Search,
  CheckCircle2,
  ExternalLink,
  Keyboard,
  UploadCloud,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRunner?: () => void;
  onOpenImport?: () => void;
}

type HelpCategory =
  | 'overview'
  | 'sending_requests'
  | 'params_and_body'
  | 'variables_and_envs'
  | 'collections_and_folders'
  | 'tests_and_runner'
  | 'import_export'
  | 'keyboard_shortcuts';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenRunner,
  onOpenImport,
}) => {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'overview' as HelpCategory, label: 'Quick Start', icon: Sparkles },
    { id: 'sending_requests' as HelpCategory, label: 'Sending Requests', icon: Send },
    { id: 'params_and_body' as HelpCategory, label: 'Params, Headers & Body', icon: Sliders },
    { id: 'variables_and_envs' as HelpCategory, label: 'Variables & Environments', icon: Variable },
    { id: 'collections_and_folders' as HelpCategory, label: 'Collections & Folders', icon: FolderTree },
    { id: 'tests_and_runner' as HelpCategory, label: 'Tests & Batch Runner', icon: Play },
    { id: 'import_export' as HelpCategory, label: 'Import & Export', icon: UploadCloud },
    { id: 'keyboard_shortcuts' as HelpCategory, label: 'Keyboard Shortcuts', icon: Keyboard },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      id="user-guide-modal-backdrop"
    >
      <div
        className="bg-[#0f131f] border border-white/15 rounded-2xl w-full max-w-4xl h-[85vh] max-h-[780px] shadow-2xl flex flex-col overflow-hidden text-zinc-200 animate-scaleUp"
        onClick={e => e.stopPropagation()}
        id="user-guide-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#151926] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                User Guide & How to Use
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30">
                  User Guide
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Learn how to build requests, manage environments, automate tests, and organize API workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Help Guide (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Sidebar + Main Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-64 border-r border-white/10 bg-[#121622] p-3 flex flex-col gap-1 shrink-0 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-3 py-1.5">
              Guide Topics
            </div>
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-zinc-400'}`} />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}

            <div className="mt-auto pt-3 border-t border-white/10">
              <div className="p-2.5 bg-[#161a28] border border-white/5 rounded-xl text-[11px] text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Client-First Tool
                </div>
                <p className="leading-relaxed">
                  Fast, low-latency API testing directly from your browser workspace with offline persistence.
                </p>
              </div>
            </div>
          </div>

          {/* Guide Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#0b0e17] space-y-6 text-sm">
            {activeCategory === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Getting Started with CloudPost</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    CloudPost is a lightning-fast API client for building, testing, organizing, and debugging HTTP requests.
                    Follow this step-by-step guide to get up and running in seconds.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center text-xs font-bold font-mono">
                      1
                    </div>
                    <h4 className="font-bold text-white text-xs">Enter Request URL</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Select an HTTP method (GET, POST, PUT, DELETE) and type your endpoint URL in the main address bar.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                      2
                    </div>
                    <h4 className="font-bold text-white text-xs">Configure Headers & Body</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Use the tabs below the address bar to set request parameters, authentication tokens, headers, or JSON payload.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-bold font-mono">
                      3
                    </div>
                    <h4 className="font-bold text-white text-xs">Hit Send</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Click <strong className="text-white">Send</strong> or press <code className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-orange-300 font-mono">Ctrl+Enter</code> to execute the request.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">
                      4
                    </div>
                    <h4 className="font-bold text-white text-xs">Inspect Results</h4>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Examine the HTTP status code (200 OK, 404, etc.), round-trip latency (ms), payload size, and response JSON body.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#151926] border border-orange-500/20 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">Workspaces & Collections</div>
                    <div className="text-xs text-zinc-300 leading-relaxed">
                      Group related API requests into collections and folders on the left sidebar. Save your requests anytime with <code className="px-1 py-0.5 bg-black/40 rounded text-orange-300 font-mono">Ctrl+S</code>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'sending_requests' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Sending HTTP Requests</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    How to compose requests, pick the right HTTP verbs, and execute them reliably.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[10px] font-bold">GET</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-mono text-[10px] font-bold">POST</span>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono text-[10px] font-bold">PUT</span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono text-[10px] font-bold">PATCH</span>
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-mono text-[10px] font-bold">DELETE</span>
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Choose the appropriate method dropdown on the left of the URL bar. The color-coded badge dynamically indicates the method type.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Direct URL or Variable Substitution</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Enter full endpoints such as <code className="text-orange-300 font-mono">https://api.example.com/v1/users</code>, or use dynamic variables such as <code className="text-orange-300 font-mono">{"{{base_url}}"}/users</code>.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Inspecting Response Data</h4>
                    <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                      <li><strong className="text-zinc-200">Body View:</strong> Formatted JSON with syntax highlighting and folding, or Raw text.</li>
                      <li><strong className="text-zinc-200">Headers Tab:</strong> View response headers returned by the remote server.</li>
                      <li><strong className="text-zinc-200">Response Metrics:</strong> Real-time status code, execution latency in milliseconds, and content download size.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'params_and_body' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Query Params, Headers & Request Body</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Fine-tune payload data, query parameters, authentication, and HTTP headers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-orange-400">1. Query Params</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Key-value pairs added to the Params tab automatically sync with the URL query string (e.g. <code className="text-orange-300 font-mono">?page=1&limit=20</code>) and vice-versa.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-emerald-400">2. Request Headers</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Set custom headers such as <code className="text-zinc-200 font-mono">Content-Type: application/json</code>, <code className="text-zinc-200 font-mono">Accept</code>, or custom API tokens. Checkboxes allow quickly enabling/disabling headers.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-blue-400">3. Body Formats</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Select from <strong className="text-white">JSON</strong>, <strong className="text-white">Form-Data</strong>, <strong className="text-white">x-www-form-urlencoded</strong>, or <strong className="text-white">Raw Text</strong>. JSON payloads include auto-formatting and validation.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-purple-400">4. Authorization Tab</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Quickly configure <strong className="text-white">Bearer Token</strong>, <strong className="text-white">Basic Auth</strong> (username/password), or <strong className="text-white">API Key</strong> headers without typing raw header strings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'variables_and_envs' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Environments & Dynamic Variables</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Reuse common URLs, authentication tokens, and user credentials across requests without manual copy-pasting.
                  </p>
                </div>

                <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white">How Variable Syntax Works</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Wrap any variable name in double curly braces: <code className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-orange-300 font-mono">{"{{variable_name}}"}</code>.
                    Variables work in the URL bar, Headers table, Query Params table, and JSON Body!
                  </p>
                  <div className="p-3 bg-black/30 border border-white/5 rounded-lg font-mono text-xs text-zinc-300">
                    {"{{base_url}}/api/v1/orders/{{order_id}}"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Global Variables</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Available across all collections and all environments in your workspace. Ideal for static keys or global default values.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Environment Scopes</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Create environments like <strong className="text-zinc-200">Development</strong>, <strong className="text-zinc-200">Staging</strong>, and <strong className="text-zinc-200">Production</strong>. Switching environments in the top navbar instantly swaps target URLs and tokens.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-white">Quick Variable Tool (+ Var)</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Click the <strong className="text-orange-400">+ Var</strong> button in the top navigation bar to quickly declare or update a variable on the fly without leaving your active tab.
                  </p>
                </div>
              </div>
            )}

            {activeCategory === 'collections_and_folders' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Collections & Request Organization</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Organize your endpoints into clean folders, workspaces, and shareable collections.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Creating Collections & Sub-Folders</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      In the left sidebar, click <strong className="text-white">+ New Collection</strong>. Inside any collection, you can add sub-folders (e.g. <code className="text-orange-300 font-mono">Authentication</code>, <code className="text-orange-300 font-mono">Users</code>, <code className="text-orange-300 font-mono">Payments</code>) to maintain organized API catalogs.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Saving Requests</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Press <code className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-orange-300 font-mono">Ctrl+S</code> or click the Save icon to commit changes to your collection. Saved requests preserve all headers, parameters, and test scripts.
                    </p>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Multi-Workspace Support</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Switch workspaces from the top navbar dropdown to keep separate projects, client contracts, or teams isolated.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'tests_and_runner' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Automated Tests & Collection Runner</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Automate validation assertions and run batch regression test suites across entire collections.
                  </p>
                </div>

                <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white">Writing Response Assertions</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    In the <strong className="text-orange-400">Tests</strong> tab of any request, write assertions to verify status codes and JSON properties:
                  </p>
                  <pre className="p-3 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
{`pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains user id", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.id).to.not.be.null;
});`}
                  </pre>
                </div>

                <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">Collection Runner</h4>
                    {onOpenRunner && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenRunner();
                        }}
                        className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 text-orange-400" />
                        Open Runner Tab
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Execute every request in a collection sequentially, with configurable iteration counts and request delay timings. Get instant visual summaries of passed vs failed assertions with one-click JSON export.
                  </p>
                </div>
              </div>
            )}

            {activeCategory === 'import_export' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Import & Export API Collections</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Easily migrate your existing collections or backup your workspace data.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">Supported Import Formats</h4>
                      {onOpenImport && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenImport();
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <UploadCloud className="w-3 h-3 text-emerald-400" />
                          Open Import Modal
                        </button>
                      )}
                    </div>
                    <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                      <li><strong className="text-zinc-200">Postman Collections:</strong> Import Postman v2.1 JSON files with all folders and requests.</li>
                      <li><strong className="text-zinc-200">OpenAPI / Swagger:</strong> Import OpenAPI 3.0+ specs in JSON or YAML.</li>
                      <li><strong className="text-zinc-200">cURL Commands:</strong> Paste any raw cURL snippet directly to generate a complete request.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-[#141824] border border-white/10 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-white">Workspace Backups & Export</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Export your entire workspace or individual collections anytime into standard JSON format for safekeeping or sharing with teammates.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'keyboard_shortcuts' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Keyboard Shortcuts</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Boost your testing speed with power-user keyboard hotkeys.
                  </p>
                </div>

                <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-[#141824]">
                  {[
                    { action: 'Send Active Request', keys: ['Ctrl', 'Enter'] },
                    { action: 'Save Active Request', keys: ['Ctrl', 'S'] },
                    { action: 'Open New Request Tab', keys: ['Ctrl', 'T'] },
                    { action: 'Close Current Tab', keys: ['Ctrl', 'W'] },
                    { action: 'Toggle Sidebar Panel', keys: ['Ctrl', '\\'] },
                    { action: 'Switch Environment', keys: ['Ctrl', 'E'] },
                    { action: 'Open Import Modal', keys: ['Ctrl', 'O'] },
                    { action: 'Close Active Modal', keys: ['Esc'] },
                  ].map((shortcut, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <span className="text-xs text-zinc-300 font-medium">{shortcut.action}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-0.5 bg-black/50 border border-white/15 text-orange-300 rounded text-[11px] font-mono shadow-sm">
                              {k}
                            </kbd>
                            {kIdx < shortcut.keys.length - 1 && (
                              <span className="text-zinc-500 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#121622] flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
            <span>Need more assistance? Check the quick shortcuts or explore collection templates.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};

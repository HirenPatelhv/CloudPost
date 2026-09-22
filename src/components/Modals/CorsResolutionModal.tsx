import React, { useState } from 'react';
import {
  HelpCircle,
  ShieldAlert,
  Server,
  Code2,
  Copy,
  Check,
  Globe,
  RefreshCw,
  ExternalLink,
  X,
  AlertTriangle,
  ChevronRight,
  Terminal,
  Cpu,
  Layers
} from 'lucide-react';

interface CorsResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl?: string;
  method?: string;
  onRetryWithProxy?: () => Promise<void> | void;
  isRetrying?: boolean;
}

type FrameworkKey = 'express' | 'php' | 'fastapi' | 'flask' | 'go' | 'spring' | 'dotnet' | 'nginx';

export const CorsResolutionModal: React.FC<CorsResolutionModalProps> = ({
  isOpen,
  onClose,
  targetUrl = '',
  method = 'GET',
  onRetryWithProxy,
  isRetrying = false,
}) => {
  const [activeTab, setActiveTab] = useState<'proxy' | 'backend' | 'protocol' | 'extensions' | 'diagnostics'>('proxy');
  const [selectedFramework, setSelectedFramework] = useState<FrameworkKey>('express');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const frameworkSnippets: Record<FrameworkKey, { name: string; lang: string; code: string; note: string }> = {
    express: {
      name: 'Node.js / Express',
      lang: 'javascript',
      note: 'Install the cors package: npm install cors',
      code: `const express = require('express');
const cors = require('cors');
const app = express();

// 1. Enable CORS for all incoming requests (Local development)
app.use(cors());

// 2. Or restrict to specific origins:
// app.use(cors({
//   origin: ['http://localhost:3000', 'https://yourdomain.com'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// }));`,
    },
    php: {
      name: 'PHP (Apache / Nginx / Shared)',
      lang: 'php',
      note: 'Add these header directives at the very top of your PHP script before any output',
      code: `<?php
// Set CORS headers for all origins
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");

// Respond immediately with 200 OK to browser preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Your existing API handler code continues below:
header("Content-Type: application/json; charset=UTF-8");
echo json_encode(["status" => "success", "data" => []]);`,
    },
    fastapi: {
      name: 'Python (FastAPI)',
      lang: 'python',
      note: 'Use FastAPI built-in CORSMiddleware',
      code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`,
    },
    flask: {
      name: 'Python (Flask)',
      lang: 'python',
      note: 'Install flask-cors: pip install flask-cors',
      code: `from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all routes and methods
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/data', methods=['GET', 'POST', 'OPTIONS'])
def get_data():
    return {"status": "ok"}`,
    },
    go: {
      name: 'Go (Gin Framework)',
      lang: 'go',
      note: 'Install gin-contrib/cors: go get github.com/gin-contrib/cors',
      code: `package main

import (
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func main() {
    router := gin.Default()

    // Allow all origins for dev
    router.Use(cors.Default())

    // Or configure custom options:
    // config := cors.DefaultConfig()
    // config.AllowAllOrigins = true
    // config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
    // router.Use(cors.New(config))

    router.Run(":8080")
}`,
    },
    spring: {
      name: 'Java (Spring Boot)',
      lang: 'java',
      note: 'Annotate your Controller with @CrossOrigin or define a WebMvcConfigurer bean',
      code: `import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
    org.springframework.web.bind.annotation.RequestMethod.GET,
    org.springframework.web.bind.annotation.RequestMethod.POST,
    org.springframework.web.bind.annotation.RequestMethod.PUT,
    org.springframework.web.bind.annotation.RequestMethod.DELETE,
    org.springframework.web.bind.annotation.RequestMethod.OPTIONS
})
public class ApiController {
    @GetMapping("/api/data")
    public String getData() {
        return "{\\"status\\":\\"success\\"}";
    }
}`,
    },
    dotnet: {
      name: 'C# / ASP.NET Core',
      lang: 'csharp',
      note: 'Add CORS service and middleware in Program.cs',
      code: `var builder = WebApplication.CreateBuilder(args);

// 1. Register CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 2. Enable CORS middleware before endpoints
app.UseCors("AllowAll");

app.MapControllers();
app.Run();`,
    },
    nginx: {
      name: 'Nginx (Reverse Proxy)',
      lang: 'nginx',
      note: 'Place inside the location /api/ block in your nginx.conf',
      code: `location /api/ {
    # CORS Header configuration
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

    # Preflight OPTIONS reply
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    proxy_pass http://127.0.0.1:8080;
}`,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#121622] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#161b2a] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">How to Resolve CORS & Connection Errors</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  HTTP 0 / Blocked
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Step-by-step guide to resolve browser cross-origin policy blocks in CloudPost
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Target Context */}
        {targetUrl && (
          <div className="px-6 py-2.5 bg-[#0e111a] border-b border-white/5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-zinc-400 font-medium shrink-0">Target Request:</span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-500/20 text-amber-400 shrink-0">
                {method}
              </span>
              <span className="font-mono text-zinc-300 truncate max-w-md" title={targetUrl}>
                {targetUrl}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 shrink-0">
              Browser Same-Origin Policy (SOP)
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 bg-[#141826] border-b border-white/10 flex items-center gap-1 overflow-x-auto shrink-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab('proxy')}
            className={`px-3 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'proxy'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-orange-400" />
            <span>1. Server Proxy (1-Click Fix)</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              Instant
            </span>
          </button>

          <button
            onClick={() => setActiveTab('backend')}
            className={`px-3 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'backend'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-orange-400" />
            <span>2. Add Backend CORS Headers</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
              Recommended
            </span>
          </button>

          <button
            onClick={() => setActiveTab('protocol')}
            className={`px-3 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'protocol'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-orange-400" />
            <span>3. Mixed Content & HTTPS</span>
          </button>

          <button
            onClick={() => setActiveTab('extensions')}
            className={`px-3 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'extensions'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
            <span>4. Browser Extensions</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-orange-500 text-orange-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-orange-400" />
            <span>5. Localhost & Port Check</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-zinc-300">
          {/* TAB 1: SERVER PROXY */}
          {activeTab === 'proxy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-orange-200">The Quickest Solution: Use CloudPost Server Proxy</h3>
                    <p className="text-zinc-300 mt-1 leading-relaxed">
                      Browsers enforce CORS only on direct client-side fetch requests made from web pages. When routed through CloudPost&apos;s built-in server proxy, the request is executed server-to-server where browser CORS restrictions do not apply.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0a0d14] rounded-xl border border-white/10 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-zinc-300">✓</span>
                  Option A: Dispatch Current Request via Proxy
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  Click the button below to retry this specific request directly through the backend proxy gateway.
                </p>

                {onRetryWithProxy && (
                  <div className="pt-2">
                    <button
                      id="modal-retry-proxy-btn"
                      type="button"
                      onClick={async () => {
                        onClose();
                        if (onRetryWithProxy) {
                          try {
                            await onRetryWithProxy();
                          } catch (e) {
                            console.error('[Retry via proxy failed]:', e);
                          }
                        }
                      }}
                      disabled={isRetrying}
                      className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md shadow-orange-950/40 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>{isRetrying ? 'Retrying via Proxy...' : 'Retry Request via Server Proxy Now'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#0a0d14] rounded-xl border border-white/10 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-zinc-300">ℹ</span>
                  How the Proxy Works
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-[#131724] rounded-lg border border-white/5">
                    <span className="text-orange-400 font-bold block mb-1">1. Browser Client</span>
                    <span className="text-zinc-400 text-[11px]">Sends payload to /api/proxy (same-origin, zero CORS issues).</span>
                  </div>
                  <div className="p-3 bg-[#131724] rounded-lg border border-white/5">
                    <span className="text-emerald-400 font-bold block mb-1">2. CloudPost Server</span>
                    <span className="text-zinc-400 text-[11px]">Server node dispatches standard HTTP socket to target API.</span>
                  </div>
                  <div className="p-3 bg-[#131724] rounded-lg border border-white/5">
                    <span className="text-blue-400 font-bold block mb-1">3. Response Returned</span>
                    <span className="text-zinc-400 text-[11px]">Clean JSON or text returned with status code, headers, and time.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BACKEND CORS HEADERS */}
          {activeTab === 'backend' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Add CORS Headers to Your Target API</h3>
                  <p className="text-zinc-400 text-[11px]">
                    If you own or maintain the backend server, configure it to send <code className="text-orange-300 bg-white/5 px-1 py-0.5 rounded font-mono">Access-Control-Allow-Origin: *</code>.
                  </p>
                </div>
              </div>

              {/* Framework Selector Pills */}
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0a0d14] rounded-xl border border-white/10">
                {(Object.keys(frameworkSnippets) as FrameworkKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFramework(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedFramework === key
                        ? 'bg-orange-500 text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {frameworkSnippets[key].name}
                  </button>
                ))}
              </div>

              {/* Selected Framework Instructions & Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {frameworkSnippets[selectedFramework].note}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedFramework, frameworkSnippets[selectedFramework].code)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white font-medium transition-colors cursor-pointer"
                  >
                    {copiedKey === selectedFramework ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-xl border border-white/10 bg-[#080a10] overflow-hidden">
                  <div className="px-4 py-2 bg-[#121624] border-b border-white/5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>{frameworkSnippets[selectedFramework].name} Configuration</span>
                    <span className="uppercase text-orange-400 font-bold">{frameworkSnippets[selectedFramework].lang}</span>
                  </div>
                  <pre className="p-4 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre">
                    {frameworkSnippets[selectedFramework].code}
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-[#131724] rounded-xl border border-white/5 text-zinc-400 text-[11px] flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Preflight OPTIONS Requests:</strong> When using custom headers like <code className="text-zinc-300">Authorization</code> or sending <code className="text-zinc-300">application/json</code>, browsers first send an HTTP <strong>OPTIONS</strong> preflight check. Ensure your backend replies with <code className="text-zinc-300">200 OK</code> or <code className="text-zinc-300">204 No Content</code> for OPTIONS requests.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: MIXED CONTENT & HTTPS */}
          {activeTab === 'protocol' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">Mixed Content Security Blocking</h3>
                    <p className="text-zinc-300 mt-1 leading-relaxed">
                      Modern browsers strictly prohibit HTTPS web applications from making unencrypted plain <code className="text-amber-300 font-mono">http://</code> network requests.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0a0d14] rounded-xl border border-white/10 space-y-2">
                  <div className="text-red-400 font-bold flex items-center gap-1.5">
                    <X className="w-4 h-4" />
                    <span>Blocked: HTTPS calling HTTP</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    If this app is opened via <code className="text-emerald-400 font-mono">https://ais-...run.app</code> and your target URL is <code className="text-red-300 font-mono">http://api.mysite.com</code> or <code className="text-red-300 font-mono">http://localhost:5000</code>, Chrome/Firefox will instantly block it before it leaves the browser.
                  </p>
                </div>

                <div className="p-4 bg-[#0a0d14] rounded-xl border border-white/10 space-y-2">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Resolution: Switch to HTTPS or Proxy</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    1. Use an <code className="text-emerald-300 font-mono">https://</code> target URL if the API supports SSL.
                    <br />
                    2. Or use the <strong>CloudPost Server Proxy</strong> (Tab 1), which securely connects from the backend server to your HTTP target.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BROWSER EXTENSIONS */}
          {activeTab === 'extensions' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0a0d14] rounded-xl border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-orange-400" />
                  Option: Chrome / Firefox CORS Extension
                </h3>
                <p className="text-zinc-300 leading-relaxed">
                  For rapid frontend development and ad-hoc API testing, a browser extension can automatically intercept network requests and append <code className="text-orange-300 font-mono">Access-Control-Allow-Origin: *</code> headers to incoming responses.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="p-3 bg-[#121624] rounded-lg border border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">Allow CORS: Access-Control-Allow-Origin</div>
                      <div className="text-[11px] text-zinc-400">Popular Chrome & Firefox extension to toggle CORS bypass on/off.</div>
                    </div>
                    <a
                      href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span>Web Store</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </a>
                  </div>

                  <div className="p-3 bg-[#121624] rounded-lg border border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">Moesif Origin & CORS Changer</div>
                      <div className="text-[11px] text-zinc-400">Advanced CORS extension with header inspection and rewrite rules.</div>
                    </div>
                    <a
                      href="https://chromewebstore.google.com/detail/moesif-origin-cors-change/digfbfapackackdnndkabiffbgakflkg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span>Web Store</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
                  ⚠️ <strong>Security Note:</strong> Remember to disable CORS extensions when browsing normal websites (banking, social media) to maintain browser security.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOCALHOST & DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0a0d14] rounded-xl border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  Verifying Localhost & Port Reachability
                </h3>
                <p className="text-zinc-300 leading-relaxed">
                  If you are testing a local server (e.g. <code className="text-orange-300 font-mono">http://localhost:3000</code> or <code className="text-orange-300 font-mono">http://localhost:8000</code>), verify that:
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3 bg-[#121624] rounded-lg border border-white/5">
                    <span className="font-semibold text-white block mb-1">1. Is your backend server running?</span>
                    <span className="text-zinc-400 text-[11px]">
                      Make sure your server is active in terminal (e.g. <code className="text-emerald-400 font-mono">npm run dev</code> or <code className="text-emerald-400 font-mono">php -S 0.0.0.0:8000</code>).
                    </span>
                  </div>

                  <div className="p-3 bg-[#121624] rounded-lg border border-white/5">
                    <span className="font-semibold text-white block mb-1">2. Try 127.0.0.1 instead of localhost</span>
                    <span className="text-zinc-400 text-[11px]">
                      Some systems bind IPv6 (::1) for &apos;localhost&apos; while the server listens only on IPv4. Try changing <code className="text-amber-300 font-mono">http://localhost:...</code> to <code className="text-emerald-300 font-mono">http://127.0.0.1:...</code>.
                    </span>
                  </div>

                  <div className="p-3 bg-[#121624] rounded-lg border border-white/5">
                    <span className="font-semibold text-white block mb-1">3. Bind to 0.0.0.0</span>
                    <span className="text-zinc-400 text-[11px]">
                      Configure your backend server to bind to <code className="text-emerald-300 font-mono">0.0.0.0</code> rather than only <code className="text-zinc-300 font-mono">127.0.0.1</code> to accept connections from outside local loopback.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#161b2a] border-t border-white/10 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Postman & Desktop tools bypass CORS because native sockets do not use browser sandboxes.</span>
          </div>

          <div className="flex items-center gap-2">
            {onRetryWithProxy && (
              <button
                id="modal-footer-retry-proxy-btn"
                type="button"
                onClick={async () => {
                  onClose();
                  if (onRetryWithProxy) {
                    try {
                      await onRetryWithProxy();
                    } catch (e) {
                      console.error('[Retry via proxy failed]:', e);
                    }
                  }
                }}
                disabled={isRetrying}
                className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 hover:text-white border border-orange-500/30 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin text-orange-400' : ''}`} />
                <span>Retry via Proxy</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

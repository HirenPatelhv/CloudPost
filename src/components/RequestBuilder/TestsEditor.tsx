import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Play, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Code2, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  BookOpen, 
  CheckCheck, 
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  RotateCcw
} from 'lucide-react';
import { ApiResponse, TestResult, Variable } from '../../types';
import { runPostmanTests } from '../../services/apiRunner';

interface TestsEditorProps {
  testsScript?: string;
  onChange: (script: string) => void;
  disabled?: boolean;
  variables?: Variable[];
  lastResponse?: ApiResponse | null;
}

interface SnippetCategory {
  id: string;
  name: string;
  icon: any;
  items: {
    title: string;
    description: string;
    snippet: string;
    category: string;
  }[];
}

const TEST_CATEGORIES: SnippetCategory[] = [
  {
    id: 'status',
    name: 'Status Code',
    icon: ShieldCheck,
    items: [
      {
        title: 'Status code is 200 OK',
        description: 'Verify HTTP status code equals 200',
        snippet: `pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});`,
        category: 'status',
      },
      {
        title: 'Status code is 201 Created',
        description: 'Verify HTTP status code equals 201',
        snippet: `pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});`,
        category: 'status',
      },
      {
        title: 'Status code is 2xx Successful',
        description: 'Verify response status is in the 200–299 range',
        snippet: `pm.test("Successful response (2xx)", function () {
    pm.expect(pm.response.status).to.be.at.least(200);
    pm.expect(pm.response.status).to.be.below(300);
});`,
        category: 'status',
      },
      {
        title: 'Status code is one of [200, 201, 204]',
        description: 'Verify status is one of allowed success codes',
        snippet: `pm.test("Status code is one of acceptable codes", function () {
    pm.expect(pm.response.status).to.be.oneOf([200, 201, 204]);
});`,
        category: 'status',
      },
      {
        title: 'Status text matches OK',
        description: 'Verify status message text',
        snippet: `pm.test("Status text is OK", function () {
    pm.expect(pm.response.statusText).to.equal("OK");
});`,
        category: 'status',
      },
    ],
  },
  {
    id: 'headers',
    name: 'Response Headers',
    icon: SlidersHorizontal,
    items: [
      {
        title: 'Header Content-Type exists',
        description: 'Check that Content-Type header is present',
        snippet: `pm.test("Content-Type header is present", function () {
    pm.response.to.have.header("Content-Type");
});`,
        category: 'headers',
      },
      {
        title: 'Content-Type contains application/json',
        description: 'Verify Content-Type is JSON',
        snippet: `pm.test("Content-Type contains application/json", function () {
    pm.expect(pm.response.headers["content-type"]).to.include("application/json");
});`,
        category: 'headers',
      },
      {
        title: 'Verify Custom Header value',
        description: 'Assert custom header matches expected value',
        snippet: `pm.test("Custom Header matches expected value", function () {
    pm.expect(pm.response.headers["x-powered-by"]).to.not.be.undefined;
});`,
        category: 'headers',
      },
      {
        title: 'Cache-Control header is set',
        description: 'Verify Cache-Control exists in response headers',
        snippet: `pm.test("Cache-Control header is present", function () {
    pm.response.to.have.header("cache-control");
});`,
        category: 'headers',
      },
    ],
  },
  {
    id: 'body',
    name: 'Response Body & JSON',
    icon: Code2,
    items: [
      {
        title: 'Response body is valid JSON object',
        description: 'Assert parsed body is a valid JSON object',
        snippet: `pm.test("Response body is valid JSON", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('object');
});`,
        category: 'body',
      },
      {
        title: 'JSON contains specific property (e.g. id)',
        description: 'Verify key exists in root object',
        snippet: `pm.test("Response contains required id field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
});`,
        category: 'body',
      },
      {
        title: 'Verify exact value of a JSON field',
        description: 'Assert property equals expected value',
        snippet: `pm.test("Verify specific field value", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status || jsonData.id).to.not.be.undefined;
});`,
        category: 'body',
      },
      {
        title: 'Response is an Array with items',
        description: 'Verify response is a non-empty array',
        snippet: `pm.test("Response is an array of items", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
    pm.expect(jsonData.length).to.be.above(0);
});`,
        category: 'body',
      },
      {
        title: 'Response body text contains substring',
        description: 'Verify raw text contains expected phrase',
        snippet: `pm.test("Response text contains expected string", function () {
    pm.expect(pm.response.text()).to.include("success");
});`,
        category: 'body',
      },
      {
        title: 'Check nested property in JSON object',
        description: 'Traverse nested path in response JSON',
        snippet: `pm.test("Check nested JSON property", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.nested.property('data.id', jsonData.data?.id);
});`,
        category: 'body',
      },
    ],
  },
  {
    id: 'timing',
    name: 'Performance & Latency',
    icon: Zap,
    items: [
      {
        title: 'Response time < 200ms',
        description: 'Ensure low latency SLA',
        snippet: `pm.test("Response time is less than 200ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});`,
        category: 'timing',
      },
      {
        title: 'Response time < 500ms',
        description: 'Standard API response time check',
        snippet: `pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});`,
        category: 'timing',
      },
      {
        title: 'Response size < 50KB',
        description: 'Guard against overly large payload sizes',
        snippet: `pm.test("Response payload size is below 50KB", function () {
    pm.expect(pm.response.responseSize).to.be.below(50000);
});`,
        category: 'timing',
      },
    ],
  },
  {
    id: 'variables',
    name: 'Variables & Chaining',
    icon: Sparkles,
    items: [
      {
        title: 'Save Auth Token to Environment',
        description: 'Extract token from response and persist to environment',
        snippet: `pm.test("Save auth token to environment", function () {
    var jsonData = pm.response.json();
    if (jsonData.token || jsonData.access_token) {
        pm.environment.set("authToken", jsonData.token || jsonData.access_token);
    }
});`,
        category: 'variables',
      },
      {
        title: 'Save Created ID to Environment',
        description: 'Save entity ID from response for subsequent requests',
        snippet: `pm.test("Save created record ID", function () {
    var jsonData = pm.response.json();
    if (jsonData.id) {
        pm.environment.set("lastCreatedId", jsonData.id);
    }
});`,
        category: 'variables',
      },
      {
        title: 'Assert response matches Environment variable',
        description: 'Compare response field against environment variable',
        snippet: `pm.test("Field matches environment variable", function () {
    var jsonData = pm.response.json();
    var expectedVal = pm.environment.get("expectedKey");
    if (expectedVal) {
        pm.expect(jsonData.key).to.equal(expectedVal);
    }
});`,
        category: 'variables',
      },
    ],
  },
];

export const TestsEditor: React.FC<TestsEditorProps> = ({
  testsScript = '',
  onChange,
  disabled,
  variables = [],
  lastResponse,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [sandboxResults, setSandboxResults] = useState<TestResult[] | null>(null);
  const [sandboxExecuting, setSandboxExecuting] = useState<boolean>(false);
  const [showBuilder, setShowBuilder] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);

  // Visual Assertion Builder State
  const [builderTarget, setBuilderTarget] = useState<'status' | 'header' | 'json' | 'text' | 'time'>('status');
  const [builderKey, setBuilderKey] = useState<string>('');
  const [builderOperator, setBuilderOperator] = useState<string>('equal');
  const [builderExpected, setBuilderExpected] = useState<string>('200');

  // Count active tests defined in script
  const testCount = useMemo(() => {
    if (!testsScript) return 0;
    const matches = testsScript.match(/pm\.test\s*\(/g);
    return matches ? matches.length : 0;
  }, [testsScript]);

  // Validate JavaScript Syntax in real-time
  const syntaxCheck = useMemo(() => {
    if (!testsScript || !testsScript.trim()) return { valid: true, error: null };
    try {
      new Function('pm', testsScript);
      return { valid: true, error: null };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }, [testsScript]);

  // Insert code snippet into editor
  const insertSnippet = (snippet: string) => {
    if (disabled) return;
    const current = testsScript.trim();
    const updated = current ? `${current}\n\n${snippet}` : snippet;
    onChange(updated);
  };

  // Clear all tests
  const handleClear = () => {
    if (disabled) return;
    if (confirm('Clear all test scripts for this request?')) {
      onChange('');
      setSandboxResults(null);
    }
  };

  // Format code (basic indentation)
  const handleFormat = () => {
    if (disabled || !testsScript.trim()) return;
    try {
      const lines = testsScript.split('\n');
      let indent = 0;
      const formatted = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('}') || trimmed.startsWith(');') || trimmed.startsWith(']')) {
          indent = Math.max(0, indent - 1);
        }
        const indentedLine = '    '.repeat(indent) + trimmed;
        if (trimmed.endsWith('{') || (trimmed.endsWith('(') && !trimmed.endsWith('()')) || trimmed.endsWith('[')) {
          indent++;
        }
        return indentedLine;
      }).join('\n');
      onChange(formatted);
    } catch {
      // ignore
    }
  };

  // Run dry-run simulation against sample or last response
  const handleDryRun = () => {
    setSandboxExecuting(true);
    setTimeout(() => {
      const mockResponse: ApiResponse = lastResponse || {
        status: 200,
        statusText: 'OK',
        time: 145,
        size: 1024,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'max-age=3600',
          'x-powered-by': 'CloudPost API Sandbox',
        },
        data: {
          id: 101,
          status: 'success',
          token: 'jwt_mock_token_sample_12345',
          user: {
            id: 1,
            name: 'API Developer',
            role: 'Admin',
            verified: true,
          },
          items: [
            { id: 1, name: 'Item Alpha' },
            { id: 2, name: 'Item Beta' },
          ],
        },
        rawBody: JSON.stringify({
          id: 101,
          status: 'success',
          token: 'jwt_mock_token_sample_12345',
          user: { id: 1, name: 'API Developer', role: 'Admin', verified: true },
          items: [{ id: 1, name: 'Item Alpha' }, { id: 2, name: 'Item Beta' }],
        }, null, 2),
        timestamp: new Date().toISOString(),
        testResults: [],
      };

      const results = runPostmanTests(testsScript, mockResponse, variables);
      setSandboxResults(results);
      setShowSandbox(true);
      setSandboxExecuting(false);
    }, 200);
  };

  // Add assertion from Visual Builder
  const handleAddFromBuilder = () => {
    let generatedCode = '';
    const testTitle = `${builderTarget.toUpperCase()} assertion`;

    if (builderTarget === 'status') {
      const codeNum = parseInt(builderExpected, 10) || 200;
      generatedCode = `pm.test("Status code is ${codeNum}", function () {\n    pm.response.to.have.status(${codeNum});\n});`;
    } else if (builderTarget === 'header') {
      const hName = builderKey.trim() || 'Content-Type';
      if (builderOperator === 'present') {
        generatedCode = `pm.test("Header '${hName}' is present", function () {\n    pm.response.to.have.header("${hName}");\n});`;
      } else {
        generatedCode = `pm.test("Header '${hName}' contains '${builderExpected}'", function () {\n    pm.expect(pm.response.headers["${hName.toLowerCase()}"]).to.include("${builderExpected}");\n});`;
      }
    } else if (builderTarget === 'json') {
      const fieldPath = builderKey.trim() || 'id';
      if (builderOperator === 'has_prop') {
        generatedCode = `pm.test("Response JSON contains property '${fieldPath}'", function () {\n    var json = pm.response.json();\n    pm.expect(json).to.have.property('${fieldPath}');\n});`;
      } else if (builderOperator === 'equal') {
        const val = isNaN(Number(builderExpected)) ? `"${builderExpected}"` : builderExpected;
        generatedCode = `pm.test("JSON field '${fieldPath}' equals ${builderExpected}", function () {\n    var json = pm.response.json();\n    pm.expect(json.${fieldPath}).to.equal(${val});\n});`;
      } else if (builderOperator === 'is_array') {
        generatedCode = `pm.test("JSON field '${fieldPath}' is an array", function () {\n    var json = pm.response.json();\n    pm.expect(json.${fieldPath}).to.be.an('array');\n});`;
      } else if (builderOperator === 'is_true') {
        generatedCode = `pm.test("JSON field '${fieldPath}' is true", function () {\n    var json = pm.response.json();\n    pm.expect(json.${fieldPath}).to.be.true;\n});`;
      }
    } else if (builderTarget === 'text') {
      generatedCode = `pm.test("Response body text contains '${builderExpected}'", function () {\n    pm.expect(pm.response.text()).to.include("${builderExpected}");\n});`;
    } else if (builderTarget === 'time') {
      const maxMs = parseInt(builderExpected, 10) || 500;
      generatedCode = `pm.test("Response latency is below ${maxMs}ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(${maxMs});\n});`;
    }

    if (generatedCode) {
      insertSnippet(generatedCode);
      setShowBuilder(false);
    }
  };

  // Filter snippets based on active category
  const filteredSnippets = useMemo(() => {
    if (selectedCategory === 'all') {
      return TEST_CATEGORIES.flatMap(c => c.items);
    }
    const cat = TEST_CATEGORIES.find(c => c.id === selectedCategory);
    return cat ? cat.items : [];
  }, [selectedCategory]);

  return (
    <div className="space-y-4 text-xs">
      {/* Top Header & Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#141824] rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Tests & Assertions</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                {testCount} {testCount === 1 ? 'Assertion' : 'Assertions'}
              </span>
              {syntaxCheck.valid ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Syntax</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Syntax Error: {syntaxCheck.error}</span>
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-[11px]">
              Custom JavaScript test assertions executed automatically against response body, headers, and status codes.
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowBuilder(!showBuilder)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${
              showBuilder
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            <span>Visual Builder</span>
          </button>

          <button
            type="button"
            onClick={handleDryRun}
            disabled={sandboxExecuting || !testsScript.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-lg font-semibold text-xs transition-colors disabled:opacity-40"
            title="Simulate and dry-run tests against response data in real-time"
          >
            <Play className={`w-3.5 h-3.5 text-emerald-400 ${sandboxExecuting ? 'animate-spin' : ''}`} />
            <span>Dry Run Sandbox</span>
          </button>

          <button
            type="button"
            onClick={handleFormat}
            disabled={disabled || !testsScript.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            title="Format JavaScript code"
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Format</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors"
            title="API Cheatsheet & Documentation"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Cheatsheet</span>
          </button>

          {testsScript.trim() && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Clear all test code"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Assertion Builder Drawer */}
      {showBuilder && (
        <div className="p-4 bg-[#10131d] rounded-xl border border-orange-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-orange-400" />
              Quick Assertion Builder
            </span>
            <span className="text-zinc-400 text-[11px]">Generate custom JS assertions without writing code</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Target Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Target</label>
              <select
                value={builderTarget}
                onChange={e => {
                  const val = e.target.value as any;
                  setBuilderTarget(val);
                  if (val === 'status') setBuilderExpected('200');
                  else if (val === 'header') { setBuilderKey('Content-Type'); setBuilderExpected('application/json'); }
                  else if (val === 'json') { setBuilderKey('id'); setBuilderExpected('1'); }
                  else if (val === 'text') { setBuilderExpected('success'); }
                  else if (val === 'time') { setBuilderExpected('500'); }
                }}
                className="w-full bg-[#181d2c] border border-white/10 rounded-lg p-2 text-white font-medium focus:border-orange-500 focus:outline-none"
              >
                <option value="status">Status Code</option>
                <option value="header">Response Header</option>
                <option value="json">JSON Body Field</option>
                <option value="text">Body Text Substring</option>
                <option value="time">Response Latency (ms)</option>
              </select>
            </div>

            {/* Key / Property (if applicable) */}
            {(builderTarget === 'header' || builderTarget === 'json') && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  {builderTarget === 'header' ? 'Header Name' : 'JSON Property / Path'}
                </label>
                <input
                  type="text"
                  value={builderKey}
                  onChange={e => setBuilderKey(e.target.value)}
                  placeholder={builderTarget === 'header' ? 'e.g. Content-Type' : 'e.g. data.id or token'}
                  className="w-full bg-[#181d2c] border border-white/10 rounded-lg p-2 text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}

            {/* Operator */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Condition</label>
              <select
                value={builderOperator}
                onChange={e => setBuilderOperator(e.target.value)}
                className="w-full bg-[#181d2c] border border-white/10 rounded-lg p-2 text-white font-medium focus:border-orange-500 focus:outline-none"
              >
                {builderTarget === 'status' && (
                  <option value="equal">Equals (==)</option>
                )}
                {builderTarget === 'header' && (
                  <>
                    <option value="include">Contains Substring</option>
                    <option value="present">Header is Present</option>
                  </>
                )}
                {builderTarget === 'json' && (
                  <>
                    <option value="has_prop">Property Exists</option>
                    <option value="equal">Equals Value</option>
                    <option value="is_array">Is an Array</option>
                    <option value="is_true">Is True</option>
                  </>
                )}
                {builderTarget === 'text' && (
                  <option value="include">Contains Substring</option>
                )}
                {builderTarget === 'time' && (
                  <option value="below">Is Below (&lt; ms)</option>
                )}
              </select>
            </div>

            {/* Expected Value */}
            {!(builderTarget === 'json' && (builderOperator === 'has_prop' || builderOperator === 'is_array' || builderOperator === 'is_true')) &&
             !(builderTarget === 'header' && builderOperator === 'present') && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Expected Value</label>
                <input
                  type="text"
                  value={builderExpected}
                  onChange={e => setBuilderExpected(e.target.value)}
                  placeholder="e.g. 200, application/json, 500"
                  className="w-full bg-[#181d2c] border border-white/10 rounded-lg p-2 text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddFromBuilder}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-md shadow-orange-500/20"
            >
              + Insert Assertion to Script
            </button>
          </div>
        </div>
      )}

      {/* Cheatsheet Modal / Drawer */}
      {showDocs && (
        <div className="p-4 bg-[#10131d] rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-orange-400" />
              Postman JavaScript Assertion Reference
            </span>
            <button onClick={() => setShowDocs(false)} className="text-zinc-500 hover:text-white font-semibold">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-mono text-zinc-300">
            <div className="p-3 bg-[#181d2c] rounded-lg border border-white/5 space-y-1.5">
              <div className="font-bold text-orange-400 font-sans uppercase text-[10px] tracking-wider">Status & Timing</div>
              <div><code className="text-emerald-400">pm.response.to.have.status(200)</code></div>
              <div><code className="text-emerald-400">pm.expect(pm.response.status).to.equal(200)</code></div>
              <div><code className="text-emerald-400">pm.expect(pm.response.responseTime).to.be.below(500)</code></div>
              <div><code className="text-emerald-400">pm.response.to.be.success</code></div>
            </div>

            <div className="p-3 bg-[#181d2c] rounded-lg border border-white/5 space-y-1.5">
              <div className="font-bold text-orange-400 font-sans uppercase text-[10px] tracking-wider">Body & Headers</div>
              <div><code className="text-emerald-400">var data = pm.response.json()</code></div>
              <div><code className="text-emerald-400">pm.expect(data).to.have.property('id')</code></div>
              <div><code className="text-emerald-400">pm.response.to.have.header('Content-Type')</code></div>
              <div><code className="text-emerald-400">pm.expect(pm.response.text()).to.include('OK')</code></div>
            </div>

            <div className="p-3 bg-[#181d2c] rounded-lg border border-white/5 space-y-1.5">
              <div className="font-bold text-orange-400 font-sans uppercase text-[10px] tracking-wider">Variables & Scope</div>
              <div><code className="text-emerald-400">pm.environment.set("token", data.token)</code></div>
              <div><code className="text-emerald-400">pm.environment.get("baseUrl")</code></div>
              <div><code className="text-emerald-400">pm.globals.set("userId", data.id)</code></div>
              <div><code className="text-emerald-400">pm.expect(data.token).to.not.be.null</code></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split View: Code Editor (Left) & Snippets Toolbox (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Code Editor Container */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-orange-400" />
              JavaScript Assertion Sandbox
            </span>
            <span className="text-zinc-500 text-[11px]">
              Available Sandbox Objects: <code className="text-orange-300 font-mono">pm.test</code>, <code className="text-orange-300 font-mono">pm.expect</code>, <code className="text-orange-300 font-mono">pm.response</code>, <code className="text-orange-300 font-mono">pm.environment</code>
            </span>
          </div>

          <div className="relative border border-white/10 rounded-xl bg-[#090b10] overflow-hidden focus-within:border-orange-500/70 transition-all shadow-inner">
            {/* Editor Top Bar */}
            <div className="px-3 py-1.5 bg-[#121622] border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                <span>JavaScript (ES6+)</span>
              </div>
              <div>{testsScript.split('\n').length} lines</div>
            </div>

            {/* Textarea with code formatting */}
            <textarea
              rows={15}
              placeholder={`// Write Postman test assertions using standard JavaScript\npm.test("Status code is 200 OK", function () {\n    pm.response.to.have.status(200);\n});\n\npm.test("Response body is valid JSON object", function () {\n    var jsonData = pm.response.json();\n    pm.expect(jsonData).to.be.an('object');\n});\n\npm.test("Response latency is below 500ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(500);\n});`}
              value={testsScript}
              disabled={disabled}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-transparent p-4 font-mono text-xs text-orange-200 placeholder-zinc-600 focus:outline-none resize-y leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Snippets & Templates Toolbox (Right) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Assertion Snippets Library
            </span>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              All Snippets
            </button>
            {TEST_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Snippet Items List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredSnippets.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#141824] hover:bg-[#181e2e] border border-white/5 hover:border-orange-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs group-hover:text-orange-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-zinc-400 text-[10.5px] mt-0.5">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => insertSnippet(item.snippet)}
                    className="shrink-0 p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white transition-all"
                    title="Insert Snippet into Editor"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dry Run Simulation Results Panel */}
      {showSandbox && sandboxResults && (
        <div className="p-4 bg-[#121624] rounded-xl border border-emerald-500/30 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-sm">Sandbox Assertion Results (Dry-Run Simulation)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                {sandboxResults.filter(r => r.passed).length} / {sandboxResults.length} Passed
              </span>
            </div>
            <button
              onClick={() => setShowSandbox(false)}
              className="text-zinc-400 hover:text-white text-xs font-semibold"
            >
              ✕ Close Simulator
            </button>
          </div>

          <div className="space-y-2">
            {sandboxResults.length === 0 ? (
              <div className="p-4 text-center text-zinc-500">
                No <code className="text-orange-300 font-mono">pm.test(...)</code> blocks were executed in this script.
              </div>
            ) : (
              sandboxResults.map((res, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                    res.passed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-red-500/10 border-red-500/30 text-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-white text-xs">{res.name}</div>
                      {res.message && (
                        <p className="text-red-300 font-mono text-[11px] mt-0.5">{res.message}</p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      res.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {res.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

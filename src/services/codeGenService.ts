import { ApiRequest, Variable, Collection, KeyValueItem, FormDataItem } from '../types';
import { interpolateString } from './variableService';

export type CodeLanguage = 
  | 'curl'
  | 'javascript'
  | 'nodejs'
  | 'python'
  | 'php'
  | 'go'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'rust'
  | 'swift'
  | 'dart'
  | 'kotlin'
  | 'shell';

export interface CodeVariant {
  id: string;
  name: string;
  language: CodeLanguage;
  extension: string;
  mimeType: string;
  generate: (request: ApiRequest, variables: Variable[], options: CodeGenOptions) => string;
}

export interface CodeGenOptions {
  resolveVariables: boolean;
  indent: '2' | '4' | 'tab';
  includeBoilerplate: boolean;
  followRedirects?: boolean;
  timeout?: number;
  lineContinuation?: boolean;
}

export const DEFAULT_OPTIONS: CodeGenOptions = {
  resolveVariables: true,
  indent: '2',
  includeBoilerplate: true,
  followRedirects: true,
  timeout: 0,
  lineContinuation: true,
};

// Helper to resolve or keep variables
function resolve(str: string, variables: Variable[], options: CodeGenOptions): string {
  if (!str) return '';
  if (!options.resolveVariables) return str;
  return interpolateString(str, variables).resolved;
}

function getIndent(options: CodeGenOptions, level = 1): string {
  const char = options.indent === 'tab' ? '\t' : options.indent === '4' ? '    ' : '  ';
  return char.repeat(level);
}

// Build URL with query params
export function getFullUrl(request: ApiRequest, variables: Variable[], options: CodeGenOptions): string {
  let base = resolve(request.url, variables, options);
  const enabledParams = (request.params || []).filter(p => p.enabled && p.key.trim());

  if (enabledParams.length > 0) {
    const urlObj = (() => {
      try {
        return new URL(base.startsWith('http') ? base : `http://${base}`);
      } catch {
        return null;
      }
    })();

    if (urlObj) {
      enabledParams.forEach(p => {
        const k = resolve(p.key, variables, options);
        const v = resolve(p.value, variables, options);
        urlObj.searchParams.set(k, v);
      });
      base = base.startsWith('http') ? urlObj.toString() : urlObj.toString().replace(/^http:\/\//, '');
    } else {
      const queryString = enabledParams
        .map(p => `${encodeURIComponent(resolve(p.key, variables, options))}=${encodeURIComponent(resolve(p.value, variables, options))}`)
        .join('&');
      base += (base.includes('?') ? '&' : '?') + queryString;
    }
  }

  // If Auth is API Key in Query
  if (request.auth.type === 'apiKey' && request.auth.apiKeyAddTo === 'query' && request.auth.apiKeyName) {
    const k = resolve(request.auth.apiKeyName, variables, options);
    const v = resolve(request.auth.apiKeyValue || '', variables, options);
    base += (base.includes('?') ? '&' : '?') + `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }

  return base;
}

// Extract headers dictionary
export function getHeaders(request: ApiRequest, variables: Variable[], options: CodeGenOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  (request.headers || []).forEach(h => {
    if (h.enabled && h.key.trim()) {
      const k = resolve(h.key, variables, options);
      const v = resolve(h.value, variables, options);
      headers[k] = v;
    }
  });

  // Auth headers
  if (request.auth.type === 'bearer' && request.auth.bearerToken) {
    headers['Authorization'] = `Bearer ${resolve(request.auth.bearerToken, variables, options)}`;
  } else if (request.auth.type === 'oauth2') {
    const rawTok = request.auth.oauth2Token || request.auth.bearerToken || '';
    if (rawTok) {
      const prefix = request.auth.oauth2HeaderPrefix || 'Bearer';
      headers['Authorization'] = `${prefix} ${resolve(rawTok, variables, options)}`;
    }
  } else if (request.auth.type === 'basic' && request.auth.basicUsername) {
    const u = resolve(request.auth.basicUsername, variables, options);
    const p = resolve(request.auth.basicPassword || '', variables, options);
    headers['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`;
  } else if (request.auth.type === 'apiKey' && request.auth.apiKeyAddTo === 'header' && request.auth.apiKeyName) {
    headers[resolve(request.auth.apiKeyName, variables, options)] = resolve(request.auth.apiKeyValue || '', variables, options);
  }

  // Content type if body present
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.body.type === 'json' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    } else if (request.body.type === 'x-www-form-urlencoded' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }

  return headers;
}

// Extract body payload
export function getBodyData(request: ApiRequest, variables: Variable[], options: CodeGenOptions): {
  raw: string;
  hasBody: boolean;
  type: string;
  jsonObj: any;
} {
  if (request.method === 'GET' || request.method === 'HEAD' || request.body.type === 'none') {
    return { raw: '', hasBody: false, type: 'none', jsonObj: null };
  }

  if (request.body.type === 'json' && request.body.rawText) {
    const raw = resolve(request.body.rawText, variables, options);
    let jsonObj = null;
    try {
      jsonObj = JSON.parse(raw);
    } catch {
      // not valid json
    }
    return { raw, hasBody: true, type: 'json', jsonObj };
  }

  if (request.body.type === 'x-www-form-urlencoded' && request.body.urlEncoded) {
    const parts = request.body.urlEncoded
      .filter((p: KeyValueItem) => p.enabled && p.key.trim())
      .map((p: KeyValueItem) => `${encodeURIComponent(resolve(p.key, variables, options))}=${encodeURIComponent(resolve(p.value, variables, options))}`);
    return { raw: parts.join('&'), hasBody: parts.length > 0, type: 'x-www-form-urlencoded', jsonObj: null };
  }

  if (request.body.type === 'form-data' && request.body.formData) {
    const obj: Record<string, string> = {};
    request.body.formData
      .filter((p: FormDataItem) => p.enabled && p.key.trim())
      .forEach((p: FormDataItem) => {
        obj[resolve(p.key, variables, options)] = resolve(p.value, variables, options);
      });
    return { raw: JSON.stringify(obj), hasBody: Object.keys(obj).length > 0, type: 'form-data', jsonObj: obj };
  }

  if (request.body.rawText) {
    return { raw: resolve(request.body.rawText, variables, options), hasBody: true, type: 'raw', jsonObj: null };
  }

  return { raw: '', hasBody: false, type: 'none', jsonObj: null };
}

// ==========================================
// 1. cURL
// ==========================================
export function generateCurl(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const nl = options.lineContinuation ? ' \\\n  ' : ' ';
  let cmd = `curl --location --request ${request.method} '${url}'`;

  Object.entries(headers).forEach(([k, v]) => {
    cmd += `${nl}--header '${k}: ${v.replace(/'/g, "'\\''")}'`;
  });

  if (body.hasBody) {
    const escaped = body.raw.replace(/'/g, "'\\''");
    cmd += `${nl}--data-raw '${escaped}'`;
  }

  return cmd;
}

// ==========================================
// 2. JavaScript (Fetch)
// ==========================================
export function generateJsFetch(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);
  const i1 = getIndent(options, 1);
  const i2 = getIndent(options, 2);

  const headersLines = Object.entries(headers).length > 0
    ? `const myHeaders = new Headers();\n${Object.entries(headers).map(([k, v]) => `myHeaders.append("${k}", "${v.replace(/"/g, '\\"')}");`).join('\n')}\n\n`
    : '';

  let bodyLine = '';
  if (body.hasBody) {
    if (body.type === 'json' && body.jsonObj) {
      bodyLine = `,\n${i1}body: JSON.stringify(${JSON.stringify(body.jsonObj, null, options.indent === '4' ? 4 : 2)})`;
    } else {
      bodyLine = `,\n${i1}body: ${JSON.stringify(body.raw)}`;
    }
  }

  return `${headersLines}const requestOptions = {
${i1}method: "${request.method}",
${i1}headers: ${Object.entries(headers).length > 0 ? 'myHeaders' : '{}'}${bodyLine},
${i1}redirect: "${options.followRedirects ? 'follow' : 'manual'}"
};

fetch("${url}", requestOptions)
${i1}.then((response) => response.text())
${i1}.then((result) => console.log(result))
${i1}.catch((error) => console.error(error));`;
}

// ==========================================
// 3. JavaScript (Axios)
// ==========================================
export function generateJsAxios(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);
  const i1 = getIndent(options, 1);

  let dataDecl = '';
  let dataProp = '';
  if (body.hasBody) {
    if (body.type === 'json' && body.jsonObj) {
      dataDecl = `const data = ${JSON.stringify(body.jsonObj, null, 2)};\n\n`;
      dataProp = `\n${i1}data: data,`;
    } else {
      dataDecl = `const data = ${JSON.stringify(body.raw)};\n\n`;
      dataProp = `\n${i1}data: data,`;
    }
  }

  return `${dataDecl}const config = {
${i1}method: '${request.method.toLowerCase()}',
${i1}maxBodyLength: Infinity,
${i1}url: '${url}',
${i1}headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n' + i1)},${dataProp}
};

axios.request(config)
${i1}.then((response) => {
${i1}${i1}console.log(JSON.stringify(response.data));
${i1}})
${i1}.catch((error) => {
${i1}${i1}console.error(error);
${i1}});`;
}

// ==========================================
// 4. JavaScript (jQuery $.ajax)
// ==========================================
export function generateJsJQuery(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);
  const i1 = getIndent(options, 1);
  const i2 = getIndent(options, 2);

  let bodySettings = '';
  if (body.hasBody) {
    bodySettings = `,\n${i1}"data": ${JSON.stringify(body.raw)}`;
  }

  return `const settings = {
${i1}"url": "${url}",
${i1}"method": "${request.method}",
${i1}"timeout": ${options.timeout || 0},
${i1}"headers": ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n' + i1)}${bodySettings}
};

$.ajax(settings).done(function (response) {
${i1}console.log(response);
}).fail(function (jqXHR, textStatus, errorThrown) {
${i1}console.error(textStatus, errorThrown);
});`;
}

// ==========================================
// 5. JavaScript (XHR)
// ==========================================
export function generateJsXhr(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerStatements = Object.entries(headers)
    .map(([k, v]) => `xhr.setRequestHeader("${k}", "${v.replace(/"/g, '\\"')}");`)
    .join('\n');

  const sendParam = body.hasBody ? JSON.stringify(body.raw) : 'null';

  return `const xhr = new XMLHttpRequest();
xhr.withCredentials = true;

xhr.addEventListener("readystatechange", function () {
  if (this.readyState === 4) {
    console.log(this.responseText);
  }
});

xhr.open("${request.method}", "${url}");
${headerStatements}

xhr.send(${sendParam});`;
}

// ==========================================
// 6. Node.js (Axios)
// ==========================================
export function generateNodeAxios(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);
  const i1 = getIndent(options, 1);

  let dataDecl = 'let data = "";';
  if (body.hasBody) {
    dataDecl = `let data = JSON.stringify(${body.jsonObj ? JSON.stringify(body.jsonObj) : JSON.stringify(body.raw)});`;
  }

  return `const axios = require('axios');
${dataDecl}

const config = {
${i1}method: '${request.method.toLowerCase()}',
${i1}maxBodyLength: Infinity,
${i1}url: '${url}',
${i1}headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n' + i1)},
${i1}data: data
};

axios.request(config)
${i1}.then((response) => {
${i1}${i1}console.log(JSON.stringify(response.data));
${i1}})
${i1}.catch((error) => {
${i1}${i1}console.error(error);
${i1}});`;
}

// ==========================================
// 7. Node.js (Native HTTPS / HTTP)
// ==========================================
export function generateNodeNative(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const fullUrl = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);
  const isHttps = fullUrl.startsWith('https');
  const mod = isHttps ? 'https' : 'http';

  let pathAndQuery = '/';
  let host = 'localhost';
  let port = isHttps ? 443 : 80;

  try {
    const parsed = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
    host = parsed.hostname;
    pathAndQuery = parsed.pathname + parsed.search;
    port = parsed.port ? parseInt(parsed.port) : (isHttps ? 443 : 80);
  } catch {
    // fallback
  }

  const postData = body.hasBody ? `const postData = JSON.stringify(${body.jsonObj ? JSON.stringify(body.jsonObj) : JSON.stringify(body.raw)});\n` : '';
  if (body.hasBody) {
    headers['Content-Length'] = 'Buffer.byteLength(postData)';
  }

  return `const ${mod} = require('follow-redirects').${mod};
const fs = require('fs');

${postData}const options = {
  'method': '${request.method}',
  'hostname': '${host}',
  'port': ${port},
  'path': '${pathAndQuery}',
  'headers': ${JSON.stringify(headers, null, 4)},
  'maxRedirects': 20
};

const req = ${mod}.request(options, function (res) {
  const chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function () {
    const body = Buffer.concat(chunks);
    console.log(body.toString());
  });

  res.on("error", function (error) {
    console.error(error);
  });
});

${body.hasBody ? 'req.write(postData);\n' : ''}req.end();`;
}

// ==========================================
// 8. Python (Requests)
// ==========================================
export function generatePythonRequests(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  let payload = 'payload = {}';
  let dataArg = 'data=payload';
  if (body.hasBody) {
    if (body.type === 'json' && body.jsonObj) {
      payload = `payload = json.dumps(${JSON.stringify(body.jsonObj, null, 4)})`;
    } else {
      payload = `payload = ${JSON.stringify(body.raw)}`;
    }
  }

  return `import requests
import json

url = "${url}"

${payload}
headers = ${JSON.stringify(headers, null, 4)}

response = requests.request("${request.method}", url, headers=headers, ${dataArg})

print(f"Status: {response.status_code}")
print(response.text)`;
}

// ==========================================
// 9. Python (http.client native)
// ==========================================
export function generatePythonHttpClient(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const fullUrl = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);
  const isHttps = fullUrl.startsWith('https');

  let host = 'localhost';
  let path = '/';
  try {
    const parsed = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
    host = parsed.host;
    path = parsed.pathname + parsed.search;
  } catch {
    // fallback
  }

  const payload = body.hasBody ? JSON.stringify(body.raw) : "''";

  return `import http.client
import json

conn = http.client.${isHttps ? 'HTTPSConnection' : 'HTTPConnection'}("${host}")
payload = ${payload}
headers = ${JSON.stringify(headers, null, 4)}

conn.request("${request.method}", "${path}", payload, headers)
res = conn.getresponse()
data = res.read()

print(f"Status: {res.status} {res.reason}")
print(data.decode("utf-8"))`;
}

// ==========================================
// 10. PHP (cURL)
// ==========================================
export function generatePhpCurl(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerArray = Object.entries(headers).map(([k, v]) => `  '${k}: ${v.replace(/'/g, "\\'")}'`);

  let postFields = '';
  if (body.hasBody) {
    postFields = `\n  CURLOPT_POSTFIELDS => ${JSON.stringify(body.raw)},`;
  }

  return `<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => '${url}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => ${options.timeout || 0},
  CURLOPT_FOLLOWLOCATION => ${options.followRedirects ? 'true' : 'false'},
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => '${request.method}',${postFields}
  CURLOPT_HTTPHEADER => array(
${headerArray.join(',\n')}
  ),
));

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
`;
}

// ==========================================
// 11. PHP (Guzzle)
// ==========================================
export function generatePhpGuzzle(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerArray = Object.entries(headers).map(([k, v]) => `    '${k}' => '${v.replace(/'/g, "\\'")}'`);
  const bodyArg = body.hasBody ? `, ${JSON.stringify(body.raw)}` : '';

  return `<?php
require_once 'vendor/autoload.php';

use GuzzleHttp\\Client;
use GuzzleHttp\\Psr7\\Request;

$client = new Client();
$headers = [
${headerArray.join(',\n')}
];
${body.hasBody ? `$body = ${JSON.stringify(body.raw)};\n` : ''}$request = new Request('${request.method}', '${url}', $headers${body.hasBody ? ', $body' : ''});
$res = $client->sendAsync($request)->wait();
echo $res->getBody();
`;
}

// ==========================================
// 12. Go (Native net/http)
// ==========================================
export function generateGoNative(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  let bodyReader = 'nil';
  let payloadDef = '';
  if (body.hasBody) {
    payloadDef = `  payload := strings.NewReader(${JSON.stringify(body.raw)})\n`;
    bodyReader = 'payload';
  }

  const headerStatements = Object.entries(headers)
    .map(([k, v]) => `  req.Header.Add("${k}", "${v.replace(/"/g, '\\"')}")`)
    .join('\n');

  return `package main

import (
  "fmt"
  "strings"
  "net/http"
  "io"
)

func main() {
  url := "${url}"
  method := "${request.method}"

${payloadDef}  client := &http.Client{}
  req, err := http.NewRequest(method, url, ${bodyReader})
  if err != nil {
    fmt.Println(err)
    return
  }
${headerStatements}

  res, err := client.Do(req)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer res.Body.Close()

  body, err := io.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return
  }
  fmt.Println(string(body))
}`;
}

// ==========================================
// 13. Java (OkHttp)
// ==========================================
export function generateJavaOkHttp(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  let mediaType = 'MediaType.parse("text/plain")';
  if (headers['Content-Type']?.includes('json')) {
    mediaType = 'MediaType.parse("application/json")';
  }

  let bodyDef = '';
  let methodCall = `.${request.method.toLowerCase()}()`;
  if (body.hasBody) {
    bodyDef = `    MediaType mediaType = ${mediaType};\n    RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(body.raw)});\n`;
    methodCall = `.${request.method.toLowerCase()}(body)`;
  } else if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    bodyDef = `    RequestBody body = RequestBody.create(null, new byte[0]);\n`;
    methodCall = `.${request.method.toLowerCase()}(body)`;
  }

  const headerAdders = Object.entries(headers)
    .map(([k, v]) => `      .addHeader("${k}", "${v.replace(/"/g, '\\"')}")`)
    .join('\n');

  return `import okhttp3.*;
import java.io.IOException;

public class Main {
  public static void main(String[] args) throws IOException {
    OkHttpClient client = new OkHttpClient().newBuilder().build();
${bodyDef}    Request request = new Request.Builder()
      .url("${url}")
      ${methodCall}
${headerAdders}
      .build();

    Response response = client.newCall(request).execute();
    System.out.println(response.body().string());
  }
}`;
}

// ==========================================
// 14. C# / .NET (HttpClient)
// ==========================================
export function generateCSharpHttpClient(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerAdders = Object.entries(headers)
    .filter(([k]) => k.toLowerCase() !== 'content-type')
    .map(([k, v]) => `request.Headers.Add("${k}", "${v.replace(/"/g, '\\"')}");`)
    .join('\n');

  let contentBlock = '';
  if (body.hasBody) {
    const contentType = headers['Content-Type'] || 'text/plain';
    contentBlock = `var content = new StringContent(${JSON.stringify(body.raw)}, null, "${contentType}");\nrequest.Content = content;\n`;
  }

  return `using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
  static async Task Main(string[] args)
  {
    var client = new HttpClient();
    var request = new HttpRequestMessage(HttpMethod.${request.method === 'DELETE' ? 'Delete' : request.method === 'PUT' ? 'Put' : request.method === 'POST' ? 'Post' : request.method === 'PATCH' ? 'Patch' : 'Get'}, "${url}");
${headerAdders ? headerAdders + '\n' : ''}${contentBlock}    var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
    Console.WriteLine(await response.Content.ReadAsStringAsync());
  }
}`;
}

// ==========================================
// 15. C# (RestSharp)
// ==========================================
export function generateCSharpRestSharp(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerAdders = Object.entries(headers)
    .map(([k, v]) => `request.AddHeader("${k}", "${v.replace(/"/g, '\\"')}");`)
    .join('\n');

  let bodyBlock = '';
  if (body.hasBody) {
    bodyBlock = `request.AddStringBody(${JSON.stringify(body.raw)}, DataFormat.Json);\n`;
  }

  return `using RestSharp;
using System;

var options = new RestClientOptions("${url}")
{
  MaxTimeout = -1,
};
var client = new RestClient(options);
var request = new RestRequest("", Method.${request.method});
${headerAdders}
${bodyBlock}RestResponse response = await client.ExecuteAsync(request);
Console.WriteLine(response.Content);`;
}

// ==========================================
// 16. Ruby (Net::HTTP)
// ==========================================
export function generateRubyNetHttp(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerSetters = Object.entries(headers)
    .map(([k, v]) => `request["${k}"] = "${v.replace(/"/g, '\\"')}"`)
    .join('\n');

  let bodySetter = '';
  if (body.hasBody) {
    bodySetter = `request.body = ${JSON.stringify(body.raw)}\n`;
  }

  const reqClass = request.method === 'POST' ? 'Post' : request.method === 'PUT' ? 'Put' : request.method === 'DELETE' ? 'Delete' : request.method === 'PATCH' ? 'Patch' : 'Get';

  return `require "uri"
require "json"
require "net/http"

url = URI("${url}")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true if url.scheme == "https"

request = Net::HTTP::${reqClass}.new(url)
${headerSetters}
${bodySetter}
response = https.request(request)
puts response.read_body`;
}

// ==========================================
// 17. Rust (reqwest async)
// ==========================================
export function generateRustReqwest(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerChains = Object.entries(headers)
    .map(([k, v]) => `        .header("${k}", "${v.replace(/"/g, '\\"')}")`)
    .join('\n');

  let bodyChain = '';
  if (body.hasBody) {
    bodyChain = `\n        .body(${JSON.stringify(body.raw)})`;
  }

  return `#[tokio::main]
async fn main() -> Result<(), Box<dyn std.error::Error>> {
    let client = reqwest::Client::builder()
        .build()?;

    let res = client
        .${request.method.toLowerCase()}("${url}")
${headerChains}${bodyChain}
        .send()
        .await?;

    println!("Status: {}", res.status());
    let body = res.text().await?;
    println!("Body: {}", body);

    Ok(())
}`;
}

// ==========================================
// 18. Swift (URLSession)
// ==========================================
export function generateSwiftUrlSession(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerSetters = Object.entries(headers)
    .map(([k, v]) => `request.addValue("${v.replace(/"/g, '\\"')}", forHTTPHeaderField: "${k}")`)
    .join('\n');

  let bodySetter = '';
  if (body.hasBody) {
    bodySetter = `let postData = ${JSON.stringify(body.raw)}.data(using: .utf8)\nrequest.httpBody = postData\n`;
  }

  return `import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

var semaphore = DispatchSemaphore(value: 0)

var request = URLRequest(url: URL(string: "${url}")!, timeoutInterval: Double.infinity)
${headerSetters}
request.httpMethod = "${request.method}"
${bodySetter}
let task = URLSession.shared.dataTask(with: request) { data, response, error in 
  guard let data = data else {
    print(String(describing: error))
    semaphore.signal()
    return
  }
  print(String(data: data, encoding: .utf8)!)
  semaphore.signal()
}

task.resume()
semaphore.wait()`;
}

// ==========================================
// 19. Dart / Flutter (http)
// ==========================================
export function generateDartHttp(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headersObj = Object.entries(headers)
    .map(([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}',`)
    .join('\n');

  let bodySetter = '';
  if (body.hasBody) {
    bodySetter = `  request.body = ${JSON.stringify(body.raw)};\n`;
  }

  return `import 'package:http/http.dart' as http;

void main() async {
  var headers = {
${headersObj}
  };
  var request = http.Request('${request.method}', Uri.parse('${url}'));
${bodySetter}  request.headers.addAll(headers);

  http.StreamedResponse response = await request.send();

  if (response.statusCode == 200) {
    print(await response.stream.bytesToString());
  } else {
    print(response.reasonPhrase);
  }
}`;
}

// ==========================================
// 20. Kotlin (OkHttp)
// ==========================================
export function generateKotlinOkHttp(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerAdders = Object.entries(headers)
    .map(([k, v]) => `  .addHeader("${k}", "${v.replace(/"/g, '\\"')}")`)
    .join('\n');

  let bodyDef = '';
  let methodCall = `.${request.method.toLowerCase()}()`;
  if (body.hasBody) {
    bodyDef = `val mediaType = "application/json; charset=utf-8".toMediaType()\nval body = ${JSON.stringify(body.raw)}.toRequestBody(mediaType)\n`;
    methodCall = `.${request.method.toLowerCase()}(body)`;
  }

  return `import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

fun main() {
  val client = OkHttpClient()
  ${bodyDef}val request = Request.Builder()
    .url("${url}")
    ${methodCall}
${headerAdders}
    .build()

  val response = client.newCall(request).execute()
  println(response.body?.string())
}`;
}

// ==========================================
// 21. HTTPie (Shell)
// ==========================================
export function generateHttpie(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerArgs = Object.entries(headers).map(([k, v]) => `'${k}:${v}'`).join(' \\\n  ');

  let dataArg = '';
  if (body.hasBody) {
    if (body.type === 'json' && body.jsonObj) {
      dataArg = ` \\\n  --json '${JSON.stringify(body.jsonObj).replace(/'/g, "'\\''")}'`;
    } else {
      dataArg = ` \\\n  --raw '${body.raw.replace(/'/g, "'\\''")}'`;
    }
  }

  return `http ${request.method} '${url}'${headerArgs ? ' \\\n  ' + headerArgs : ''}${dataArg}`;
}

// ==========================================
// 22. Wget (Shell)
// ==========================================
export function generateWget(request: ApiRequest, variables: Variable[], options: CodeGenOptions = DEFAULT_OPTIONS): string {
  const url = getFullUrl(request, variables, options);
  const headers = getHeaders(request, variables, options);
  const body = getBodyData(request, variables, options);

  const headerArgs = Object.entries(headers).map(([k, v]) => `--header="${k}: ${v.replace(/"/g, '\\"')}"`).join(' \\\n  ');

  let bodyArg = '';
  if (body.hasBody) {
    bodyArg = ` \\\n  --post-data='${body.raw.replace(/'/g, "'\\''")}'`;
  }

  return `wget --method=${request.method} \\\n  ${headerArgs ? headerArgs + ' \\\n  ' : ''}--output-document=- \\\n  '${url}'${bodyArg}`;
}

// ==========================================
// Registry of All Code Variants
// ==========================================
export const ALL_VARIANTS: CodeVariant[] = [
  {
    id: 'curl',
    name: 'cURL',
    language: 'curl',
    extension: 'sh',
    mimeType: 'text/x-sh',
    generate: generateCurl,
  },
  {
    id: 'js-fetch',
    name: 'JavaScript (Fetch)',
    language: 'javascript',
    extension: 'js',
    mimeType: 'application/javascript',
    generate: generateJsFetch,
  },
  {
    id: 'js-axios',
    name: 'JavaScript (Axios)',
    language: 'javascript',
    extension: 'js',
    mimeType: 'application/javascript',
    generate: generateJsAxios,
  },
  {
    id: 'js-jquery',
    name: 'JavaScript (jQuery)',
    language: 'javascript',
    extension: 'js',
    mimeType: 'application/javascript',
    generate: generateJsJQuery,
  },
  {
    id: 'js-xhr',
    name: 'JavaScript (XHR)',
    language: 'javascript',
    extension: 'js',
    mimeType: 'application/javascript',
    generate: generateJsXhr,
  },
  {
    id: 'node-axios',
    name: 'Node.js (Axios)',
    language: 'nodejs',
    extension: 'js',
    mimeType: 'application/javascript',
    generate: generateNodeAxios,
  },
  {
    id: 'node-native',
    name: 'Node.js (Native HTTP/S)',
    language: 'nodejs',
    extension: 'js',
    mimeType: 'application/javascript',
    generate: generateNodeNative,
  },
  {
    id: 'python-requests',
    name: 'Python (Requests)',
    language: 'python',
    extension: 'py',
    mimeType: 'text/x-python',
    generate: generatePythonRequests,
  },
  {
    id: 'python-httpclient',
    name: 'Python (http.client)',
    language: 'python',
    extension: 'py',
    mimeType: 'text/x-python',
    generate: generatePythonHttpClient,
  },
  {
    id: 'php-curl',
    name: 'PHP (cURL)',
    language: 'php',
    extension: 'php',
    mimeType: 'text/x-php',
    generate: generatePhpCurl,
  },
  {
    id: 'php-guzzle',
    name: 'PHP (Guzzle)',
    language: 'php',
    extension: 'php',
    mimeType: 'text/x-php',
    generate: generatePhpGuzzle,
  },
  {
    id: 'go-native',
    name: 'Go (Native net/http)',
    language: 'go',
    extension: 'go',
    mimeType: 'text/x-go',
    generate: generateGoNative,
  },
  {
    id: 'java-okhttp',
    name: 'Java (OkHttp)',
    language: 'java',
    extension: 'java',
    mimeType: 'text/x-java-source',
    generate: generateJavaOkHttp,
  },
  {
    id: 'csharp-httpclient',
    name: 'C# (HttpClient)',
    language: 'csharp',
    extension: 'cs',
    mimeType: 'text/plain',
    generate: generateCSharpHttpClient,
  },
  {
    id: 'csharp-restsharp',
    name: 'C# (RestSharp)',
    language: 'csharp',
    extension: 'cs',
    mimeType: 'text/plain',
    generate: generateCSharpRestSharp,
  },
  {
    id: 'ruby-nethttp',
    name: 'Ruby (Net::HTTP)',
    language: 'ruby',
    extension: 'rb',
    mimeType: 'text/x-ruby',
    generate: generateRubyNetHttp,
  },
  {
    id: 'rust-reqwest',
    name: 'Rust (reqwest)',
    language: 'rust',
    extension: 'rs',
    mimeType: 'text/rust',
    generate: generateRustReqwest,
  },
  {
    id: 'swift-urlsession',
    name: 'Swift (URLSession)',
    language: 'swift',
    extension: 'swift',
    mimeType: 'text/x-swift',
    generate: generateSwiftUrlSession,
  },
  {
    id: 'dart-http',
    name: 'Dart (http)',
    language: 'dart',
    extension: 'dart',
    mimeType: 'text/x-dart',
    generate: generateDartHttp,
  },
  {
    id: 'kotlin-okhttp',
    name: 'Kotlin (OkHttp)',
    language: 'kotlin',
    extension: 'kt',
    mimeType: 'text/x-kotlin',
    generate: generateKotlinOkHttp,
  },
  {
    id: 'shell-httpie',
    name: 'Shell (HTTPie)',
    language: 'shell',
    extension: 'sh',
    mimeType: 'text/x-sh',
    generate: generateHttpie,
  },
  {
    id: 'shell-wget',
    name: 'Shell (Wget)',
    language: 'shell',
    extension: 'sh',
    mimeType: 'text/x-sh',
    generate: generateWget,
  },
];

// Helper to generate code by variant ID
export function generateCodeByVariant(
  variantId: string,
  request: ApiRequest,
  variables: Variable[],
  options: CodeGenOptions = DEFAULT_OPTIONS
): string {
  const variant = ALL_VARIANTS.find(v => v.id === variantId) || ALL_VARIANTS[0];
  return variant.generate(request, variables, options);
}

// Generate an entire collection suite script (e.g. bash test script)
export function generateCollectionBashScript(
  collection: Collection,
  variables: Variable[],
  options: CodeGenOptions = DEFAULT_OPTIONS
): string {
  const allReqs: ApiRequest[] = [...collection.requests];
  collection.folders.forEach(f => allReqs.push(...f.requests));

  const calls = allReqs.map((req, idx) => {
    const curl = generateCurl(req, variables, options);
    return `echo "[$(( ${idx + 1} ))/${allReqs.length}] Executing: ${req.name} (${req.method})"
${curl}
echo -e "\\n---"
sleep 0.5`;
  }).join('\n\n');

  return `#!/usr/bin/env bash
# ==============================================================================
# CloudPost Automated Test Runner Script
# Collection: ${collection.name}
# Total Requests: ${allReqs.length}
# ==============================================================================

set -e

echo "Starting automated execution for collection: ${collection.name}"
echo "========================================================="

${calls}

echo "All ${allReqs.length} requests executed successfully."`;
}

// Generate an entire collection in Node.js Async Runner
export function generateCollectionNodeScript(
  collection: Collection,
  variables: Variable[],
  options: CodeGenOptions = DEFAULT_OPTIONS
): string {
  const allReqs: ApiRequest[] = [...collection.requests];
  collection.folders.forEach(f => allReqs.push(...f.requests));

  return `/**
 * Automated Collection Runner
 * Collection: ${collection.name}
 * Generated by CloudPost
 */
const axios = require('axios');

async function runCollection() {
  console.log("Starting collection: ${collection.name} (${allReqs.length} requests)...");
  
  const requests = [
${allReqs.map(req => {
  const url = getFullUrl(req, variables, options);
  const headers = getHeaders(req, variables, options);
  const body = getBodyData(req, variables, options);
  return `    {
      name: "${req.name}",
      method: "${req.method}",
      url: "${url}",
      headers: ${JSON.stringify(headers)},
      data: ${body.hasBody ? JSON.stringify(body.raw) : 'null'}
    }`;
}).join(',\n')}
  ];

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    console.log(\`[\${i + 1}/\${requests.length}] Dispatching \${req.method} \${req.name}...\`);
    try {
      const response = await axios({
        method: req.method,
        url: req.url,
        headers: req.headers,
        data: req.data
      });
      console.log(\`  ✓ Status: \${response.status} \${response.statusText}\`);
    } catch (err) {
      console.error(\`  ✗ Failed: \${err.message}\`);
    }
  }
  
  console.log("Collection execution complete.");
}

runCollection();`;
}

// Backward compatibility helper
export function generateFetch(request: ApiRequest, variables: Variable[]): string {
  return generateJsFetch(request, variables, DEFAULT_OPTIONS);
}
export function generatePython(request: ApiRequest, variables: Variable[]): string {
  return generatePythonRequests(request, variables, DEFAULT_OPTIONS);
}

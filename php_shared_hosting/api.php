<?php
/**
 * CloudPost API Studio - PHP Request & Response Persistence Engine
 * Saves and manages full API request & response logs, metrics, headers, and history.
 * (All live API calls are handled directly in client-side JavaScript).
 */
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/storage.php';

$action = $_GET['action'] ?? '';
$releaseId = null;

// Support clean URLs for desktop release endpoints (e.g. /api/desktop/releases, /desktop/check-update)
if (empty($action)) {
    $requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (strpos($requestUri, 'desktop/check-update') !== false) {
        $action = 'desktop_check_update';
    } elseif (strpos($requestUri, 'desktop/releases') !== false) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (preg_match('#desktop/releases/([^/]+)/download#', $requestUri, $m)) {
                $action = 'desktop_increment_download';
                $releaseId = $m[1];
            } else {
                $action = 'desktop_publish_release';
            }
        } else {
            $action = 'desktop_releases';
        }
    } elseif (strpos($requestUri, 'desktop/download') !== false) {
        $action = 'desktop_download';
        if (preg_match('#desktop/download/([^/?]+)#', $requestUri, $m)) {
            $_GET['platform'] = $m[1];
        }
    }
}
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true) ?: [];

// Decode base64 encoded proxy payloads to bypass WAF
if (isset($input['encoded_payload'])) {
    $decodedJSON = base64_decode($input['encoded_payload']);
    if ($decodedJSON) {
        $decodedInput = json_decode($decodedJSON, true);
        if ($decodedInput) {
            $input = array_merge($input, $decodedInput);
        }
    }
}

$userId = function_exists('resolveCurrentSessionUserId') 
    ? resolveCurrentSessionUserId($input['userId'] ?? ($_GET['user_id'] ?? null))
    : ($_SESSION['user_id'] ?? ($input['userId'] ?? ($_GET['user_id'] ?? ($_COOKIE['cp_guest_id'] ?? 'guest_' . uniqid()))));
$workspaceId = $input['workspaceId'] ?? ($_GET['workspace_id'] ?? 'ws_default');

// 0. Postman Direct Import & Raw JSON Sharing Handler
if ($action === 'create_short_link' || $action === 'share_publish') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: *');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }

    $type = $input['type'] ?? 'collection';
    $title = $input['title'] ?? ($type === 'collection' ? 'Shared Collection' : 'Shared Request');
    $data = $input['data'] ?? null;

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing data payload']);
        exit;
    }

    // Generate short code: 6 characters, e.g. s_3a9f1b
    $code = 's_' . substr(md5(uniqid(mt_rand(), true)), 0, 6);
    $postmanJson = convertPhpToPostmanV2($data);

    saveSharedResource($code, $type, $title, $data, $postmanJson);

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $baseUrl = $protocol . '://' . $host . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') . '/';

    echo json_encode([
        'success' => true,
        'code' => $code,
        'short_url' => $baseUrl . '?s=' . $code,
        'clean_short_url' => $baseUrl . 's/' . $code,
        'postman_url' => $baseUrl . 'api?action=postman_share&s=' . $code,
    ]);
    exit;
}

if ($action === 'get_short_link' || $action === 'share_get') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: *');

    $code = $_GET['code'] ?? ($_GET['s'] ?? ($_GET['id'] ?? ''));
    if (empty($code)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing short link code']);
        exit;
    }

    $resource = getSharedResource($code);
    if ($resource) {
        echo json_encode([
            'success' => true,
            'id' => $resource['id'],
            'type' => $resource['type'],
            'title' => $resource['title'],
            'data' => $resource['data'],
        ]);
        exit;
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Short link not found or expired']);
    exit;
}

if ($action === 'postman_share' || $action === 'postman_import_link') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: *');

    $sParam = $_GET['s'] ?? ($_GET['code'] ?? '');
    $idParam = $_GET['id'] ?? '';
    $dataParam = $_GET['data'] ?? '';

    // 1. Resolve from short link code
    if (!empty($sParam)) {
        $resource = getSharedResource($sParam);
        if ($resource) {
            if (!empty($resource['postman_json'])) {
                echo json_encode($resource['postman_json'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;
            }
            echo json_encode(convertPhpToPostmanV2($resource['data']), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    // 2. Resolve from base64 data query param
    if (!empty($dataParam)) {
        $decoded = json_decode(base64_decode(urldecode($dataParam)), true);
        if ($decoded) {
            echo json_encode(convertPhpToPostmanV2($decoded), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    // 3. Resolve from collection id or stored share id
    if (!empty($idParam)) {
        $resource = getSharedResource($idParam);
        if ($resource) {
            if (!empty($resource['postman_json'])) {
                echo json_encode($resource['postman_json'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;
            }
            echo json_encode(convertPhpToPostmanV2($resource['data']), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            exit;
        }

        // Query stored collection by id
        $pdo = getDbConnection();
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("SELECT data_json FROM cp_collections WHERE id = ? LIMIT 1");
                $stmt->execute([$idParam]);
                $row = $stmt->fetch();
                if ($row && !empty($row['data_json'])) {
                    $col = json_decode($row['data_json'], true);
                    echo json_encode(convertPhpToPostmanV2($col), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                    exit;
                }
            } catch (Throwable $e) {}
        }
    }

    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid data/short-link parameter']);
    exit;
}

function convertPhpToPostmanV2($item) {
    if (empty($item)) return ['info' => ['name' => 'Empty Collection', 'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'], 'item' => []];
    
    if (!empty($item['info']['schema']) && strpos($item['info']['schema'], 'collection.json') !== false) {
        return $item;
    }

    $convertReq = function($req) {
        $headers = [];
        foreach ($req['headers'] ?? [] as $h) {
            if (!empty($h['key']) && ($h['enabled'] ?? true)) {
                $headers[] = ['key' => $h['key'], 'value' => $h['value'] ?? '', 'type' => 'text'];
            }
        }
        $query = [];
        foreach ($req['params'] ?? [] as $p) {
            if (!empty($p['key']) && ($p['enabled'] ?? true)) {
                $query[] = ['key' => $p['key'], 'value' => $p['value'] ?? ''];
            }
        }
        $body = null;
        if (!empty($req['body'])) {
            $bType = $req['body']['type'] ?? 'none';
            if ($bType === 'raw' || $bType === 'json') {
                $body = [
                    'mode' => 'raw',
                    'raw' => $req['body']['rawText'] ?? '',
                    'options' => ['raw' => ['language' => ($req['body']['rawType'] ?? '') === 'application/json' || $bType === 'json' ? 'json' : 'text']]
                ];
            } elseif ($bType === 'x-www-form-urlencoded') {
                $urlencoded = [];
                foreach ($req['body']['urlEncoded'] ?? [] as $u) {
                    $urlencoded[] = ['key' => $u['key'], 'value' => $u['value'] ?? '', 'disabled' => !($u['enabled'] ?? true)];
                }
                $body = ['mode' => 'urlencoded', 'urlencoded' => $urlencoded];
            }
        }
        return [
            'name' => $req['name'] ?? 'Untitled Request',
            'request' => [
                'method' => $req['method'] ?? 'GET',
                'header' => $headers,
                'url' => [
                    'raw' => $req['url'] ?? '',
                    'query' => $query
                ],
                'body' => $body
            ]
        ];
    };

    if ((isset($item['method']) || isset($item['url'])) && !isset($item['requests'])) {
        $name = $item['name'] ?? 'Shared Request';
        return [
            'info' => [
                '_postman_id' => 'col_' . ($item['id'] ?? uniqid()),
                'name' => $name,
                'description' => 'Exported from CloudPost',
                'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            ],
            'item' => [$convertReq($item)]
        ];
    }

    $colName = $item['name'] ?? 'CloudPost Collection';
    $convertFolder = null;
    $convertFolder = function($folder) use (&$convertFolder, $convertReq) {
        $subItems = [];
        foreach ($folder['subFolders'] ?? [] as $sf) {
            $subItems[] = $convertFolder($sf);
        }
        foreach ($folder['requests'] ?? [] as $r) {
            $subItems[] = $convertReq($r);
        }
        return [
            'name' => $folder['name'] ?? 'Folder',
            'item' => $subItems
        ];
    };

    $items = [];
    foreach ($item['folders'] ?? [] as $f) {
        $items[] = $convertFolder($f);
    }
    foreach ($item['requests'] ?? [] as $r) {
        $items[] = $convertReq($r);
    }

    return [
        'info' => [
            '_postman_id' => $item['id'] ?? ('col_' . uniqid()),
            'name' => $colName,
            'description' => $item['description'] ?? 'Exported from CloudPost',
            'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        ],
        'item' => $items
    ];
}

// 1.0 OAuth 2.0 Token Retrieval Engine
if ($action === 'oauth2_token' || (isset($input['action']) && $input['action'] === 'oauth2_token')) {
    $targetTokenUrl = $input['targetTokenUrl'] ?? '';
    $clientId = $input['clientId'] ?? '';
    $clientSecret = $input['clientSecret'] ?? '';
    $grantType = $input['grantType'] ?? 'client_credentials';
    $scope = $input['scope'] ?? '';
    $audience = $input['audience'] ?? '';
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    $refreshToken = $input['refreshToken'] ?? '';
    $clientAuth = $input['clientAuth'] ?? 'body';

    if (empty($targetTokenUrl)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_request',
            'error_description' => 'Target Access Token URL is required.'
        ]);
        exit;
    }

    $isMockUrl = (
        $targetTokenUrl === '/api/oauth2/token' ||
        $targetTokenUrl === 'api.php?action=oauth2_token' ||
        strpos($targetTokenUrl, 'mock') !== false ||
        strpos($targetTokenUrl, 'example.com') !== false
    );

    if ($isMockUrl) {
        $simulatedToken = 'cp_php_m2m_' . base64_encode(($clientId ?: 'client') . ':' . time()) . '.' . substr(md5(uniqid('', true)), 0, 10);
        echo json_encode([
            'access_token' => $simulatedToken,
            'token_type' => 'Bearer',
            'expires_in' => 3600,
            'scope' => $scope ?: 'read:data write:data offline_access',
            'refresh_token' => 'cp_php_rf_' . substr(md5(uniqid('', true)), 0, 16),
            'created_at' => time(),
            'provider' => 'CloudPost PHP Native OAuth2 Engine',
            'grant_type' => $grantType
        ]);
        exit;
    }

    // Build form parameters
    $postFields = [
        'grant_type' => $grantType
    ];
    if (!empty($scope)) $postFields['scope'] = $scope;
    if (!empty($audience)) $postFields['audience'] = $audience;

    if ($grantType === 'password') {
        $postFields['username'] = $username;
        $postFields['password'] = $password;
    } else if ($grantType === 'refresh_token') {
        $postFields['refresh_token'] = $refreshToken;
    }

    $curlHeaders = [
        'Accept: application/json',
        'User-Agent: CloudPost-PHP/1.0',
        'Content-Type: application/x-www-form-urlencoded'
    ];

    if ($clientAuth === 'basic' && !empty($clientId)) {
        $curlHeaders[] = 'Authorization: Basic ' . base64_encode($clientId . ':' . $clientSecret);
    } else {
        if (!empty($clientId)) $postFields['client_id'] = $clientId;
        if (!empty($clientSecret)) $postFields['client_secret'] = $clientSecret;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $targetTokenUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);

        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            http_response_code(502);
            echo json_encode([
                'error' => 'network_error',
                'error_description' => 'cURL Error: ' . $err
            ]);
            exit;
        }

        $decoded = json_decode($resp, true);
        if ($decoded !== null) {
            http_response_code($httpCode ?: 200);
            echo json_encode($decoded);
        } else {
            http_response_code($httpCode ?: 200);
            echo $resp;
        }
        exit;
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", array_merge($curlHeaders, ['Content-Type: application/x-www-form-urlencoded'])),
                'content' => http_build_query($postFields),
                'ignore_errors' => true,
                'timeout' => 20
            ],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
        ]);
        $resp = @file_get_contents($targetTokenUrl, false, $context);
        if ($resp === false) {
            http_response_code(502);
            echo json_encode([
                'error' => 'network_error',
                'error_description' => 'Failed to connect to OAuth2 server.'
            ]);
            exit;
        }
        echo $resp;
        exit;
    }
}

// 1. Server-Side Proxy Execution (Bypasses Browser CORS Restrictions)
if ($action === 'proxy' || (isset($input['action']) && $input['action'] === 'proxy')) {
    $targetUrl = $input['url'] ?? ($input['proxyUrl'] ?? '');
    if (empty($targetUrl)) {
        http_response_code(400);
        echo json_encode(['status' => 400, 'statusText' => 'Bad Request', 'data' => 'No URL provided for proxy.', 'isError' => true]);
        exit;
    }

    $method = strtoupper($input['method'] ?? 'GET');
    $headers = $input['headers'] ?? [];
    $body = $input['body'] ?? null;
    $timeout = isset($input['timeout']) ? intval($input['timeout']) : 30;

    $startTime = microtime(true);
    
    // Prepare formatted headers for cURL
    $curlHeaders = [];
    $hasContentType = false;
    $hasUserAgent = false;
    $forbiddenHeaders = ['host', 'connection', 'content-length', 'transfer-encoding', 'expect'];

    if (is_array($headers)) {
        foreach ($headers as $k => $v) {
            if (is_numeric($k) && is_array($v) && isset($v['key'])) {
                $headerName = strtolower(trim($v['key']));
                if (!empty($v['enabled']) && !empty($v['key']) && !in_array($headerName, $forbiddenHeaders)) {
                    if ($headerName === 'content-type') {
                        $hasContentType = true;
                    }
                    if ($headerName === 'user-agent') {
                        $hasUserAgent = true;
                    }
                    $curlHeaders[] = $v['key'] . ': ' . ($v['value'] ?? '');
                }
            } else if (is_string($k)) {
                $headerName = strtolower(trim($k));
                if (!in_array($headerName, $forbiddenHeaders)) {
                    if ($headerName === 'content-type') {
                        $hasContentType = true;
                    }
                    if ($headerName === 'user-agent') {
                        $hasUserAgent = true;
                    }
                    $curlHeaders[] = $k . ': ' . (is_string($v) ? $v : json_encode($v));
                }
            }
        }
    }

    if (!$hasUserAgent) {
        $curlHeaders[] = 'User-Agent: CloudPost/2.4.0 (PHP-Shared-Proxy)';
    }

    // Auto-override Content-Type in PHP proxy to prevent mismatched payload errors
    $bodyType = $input['bodyType'] ?? '';
    if ($bodyType === 'x-www-form-urlencoded') {
        $curlHeaders = array_values(array_filter($curlHeaders, function($h) {
            return stripos($h, 'content-type:') !== 0;
        }));
        $curlHeaders[] = 'Content-Type: application/x-www-form-urlencoded';
    } else if ($bodyType === 'json') {
        $curlHeaders = array_values(array_filter($curlHeaders, function($h) {
            return stripos($h, 'content-type:') !== 0;
        }));
        $curlHeaders[] = 'Content-Type: application/json';
    } else if (!$hasContentType && $method !== 'GET' && $method !== 'HEAD' && $body !== null && $body !== '') {
        $trimmedBody = is_string($body) ? trim($body) : '';
        if (is_array($body) || (is_string($body) && (substr($trimmedBody, 0, 1) === '{' || substr($trimmedBody, 0, 1) === '['))) {
            $curlHeaders[] = 'Content-Type: application/json';
        } else if (is_string($body) && strpos($body, '=') !== false) {
            $curlHeaders[] = 'Content-Type: application/x-www-form-urlencoded';
        }
    }

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $targetUrl);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        if (!empty($curlHeaders)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);
        }

        if ($method !== 'GET' && $method !== 'HEAD' && $body !== null && $body !== '') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
        }

        $response = curl_exec($ch);
        $durationMs = round((microtime(true) - $startTime) * 1000);

        if (curl_errno($ch)) {
            $errorMsg = curl_error($ch);
            curl_close($ch);
            echo json_encode([
                'status' => 0,
                'statusText' => 'Proxy Connection Error',
                'headers' => (object)[],
                'data' => 'Server Proxy Error: ' . $errorMsg,
                'time' => $durationMs,
                'size' => 0,
                'url' => $targetUrl,
                'isError' => true,
                'isProxied' => true
            ]);
            exit;
        }

        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $rawHeaders = substr($response, 0, $headerSize);
        $responseBody = substr($response, $headerSize);
        $effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);

        $parsedHeaders = [];
        $headerLines = explode("\r\n", $rawHeaders);
        foreach ($headerLines as $line) {
            if (strpos($line, ':') !== false) {
                list($hKey, $hVal) = explode(':', $line, 2);
                $parsedHeaders[trim($hKey)] = trim($hVal);
            }
        }

        echo json_encode([
            'status' => $statusCode ?: 200,
            'statusText' => $statusCode ? 'HTTP ' . $statusCode : 'OK',
            'headers' => $parsedHeaders,
            'data' => $responseBody,
            'time' => $durationMs,
            'size' => strlen($responseBody),
            'url' => $effectiveUrl ?: $targetUrl,
            'isError' => false,
            'isProxied' => true
        ]);
        exit;
    } else {
        // Fallback using file_get_contents stream context
        $opts = [
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $curlHeaders),
                'content' => ($method !== 'GET' && $method !== 'HEAD' && $body !== null) ? (is_string($body) ? $body : json_encode($body)) : null,
                'ignore_errors' => true,
                'timeout' => $timeout
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ];
        $context = stream_context_create($opts);
        $resData = @file_get_contents($targetUrl, false, $context);
        $durationMs = round((microtime(true) - $startTime) * 1000);
        
        $statusLine = $http_response_header[0] ?? 'HTTP/1.1 200 OK';
        preg_match('{HTTP\/\S*\s(\d{3})}', $statusLine, $match);
        $status = isset($match[1]) ? intval($match[1]) : 200;

        $parsedHeaders = [];
        if (isset($http_response_header)) {
            foreach ($http_response_header as $h) {
                if (strpos($h, ':') !== false) {
                    list($k, $v) = explode(':', $h, 2);
                    $parsedHeaders[trim($k)] = trim($v);
                }
            }
        }

        echo json_encode([
            'status' => $status,
            'statusText' => 'HTTP ' . $status,
            'headers' => $parsedHeaders,
            'data' => $resData ?: '',
            'time' => $durationMs,
            'size' => strlen($resData ?: ''),
            'url' => $targetUrl,
            'isError' => false,
            'isProxied' => true
        ]);
        exit;
    }
}

// 2. Save Request and Response Details (Logged by JavaScript client)
if ($action === 'save_history' || (isset($input['request']) && isset($input['response'])) || isset($input['statusCode'])) {
    $input['userId'] = $userId;
    $input['workspaceId'] = $workspaceId;
    
    $saved = saveExecutionHistory($input);
    
    echo json_encode([
        'success' => $saved,
        'message' => $saved ? 'Request & response details saved successfully.' : 'Saved to fallback storage.',
        'id' => $input['id'] ?? null,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 2. Fetch Stored Execution History
if ($action === 'get_history') {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $history = getExecutionHistory($userId, $workspaceId !== 'all' ? $workspaceId : null, $limit);
    
    echo json_encode([
        'success' => true,
        'count' => count($history),
        'history' => $history
    ]);
    exit;
}

// 3. Clear Stored History
if ($action === 'clear_history') {
    $cleared = clearExecutionHistory($userId);
    echo json_encode([
        'success' => $cleared,
        'message' => 'Execution history cleared successfully.'
    ]);
    exit;
}

// 4. App State Persistence Endpoints
if ($action === 'save_state') {
    $saved = saveAppStateToDb($userId, $input);
    echo json_encode([
        'success' => $saved,
        'message' => 'App state persisted successfully.',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

if ($action === 'get_state') {
    $state = loadAppStateFromDb($userId);
    echo json_encode([
        'success' => true,
        'state' => $state
    ]);
    exit;
}

// 5. SaaS Customers & Metering Endpoints
if ($action === 'get_saas_customers') {
    $search = $_GET['search'] ?? '';
    $plan = $_GET['plan'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $sortBy = $_GET['sort'] ?? 'mrr';
    
    $customers = getSaaSCustomersFromDb($search, $plan, $status, $sortBy);
    echo json_encode([
        'success' => true,
        'count' => count($customers),
        'customers' => $customers
    ]);
    exit;
}

if ($action === 'save_saas_customer') {
    $savedId = saveSaaSCustomerToDb($input);
    echo json_encode([
        'success' => true,
        'id' => $savedId,
        'message' => 'SaaS customer saved successfully.'
    ]);
    exit;
}

// 4.1 Mock Server Engine
if ($action === 'mock_serve' || (isset($input['action']) && $input['action'] === 'mock_serve')) {
    $delay = intval($input['responseDelayMs'] ?? ($_GET['delay'] ?? 0));
    $status = intval($input['responseStatus'] ?? ($_GET['status'] ?? 200));
    $body = $input['responseBody'] ?? ($_GET['body'] ?? '{"status":"ok"}');
    $headers = $input['responseHeaders'] ?? [];

    if ($delay > 0) {
        usleep(min($delay, 5000) * 1000); // delay in microseconds, max 5s
    }

    http_response_code($status > 0 ? $status : 200);

    // Apply custom headers
    if (is_array($headers)) {
        foreach ($headers as $h) {
            if (!empty($h['enabled']) && !empty($h['key'])) {
                header($h['key'] . ': ' . ($h['value'] ?? ''));
            }
        }
    }
    if (!headers_sent()) {
        header('X-Mock-Provider: CloudPost-Mock-Engine');
    }

    if (is_array($body) || is_object($body)) {
        echo json_encode($body, JSON_PRETTY_PRINT);
    } else {
        echo $body;
    }
    exit;
}

// 4.2 GraphQL Proxy Engine (Zero CORS)
if ($action === 'graphql_proxy' || (isset($input['action']) && $input['action'] === 'graphql_proxy')) {
    $targetUrl = $input['url'] ?? '';
    $query = $input['query'] ?? '';
    $variables = $input['variables'] ?? [];
    $customHeaders = $input['headers'] ?? [];

    if (empty($targetUrl)) {
        http_response_code(400);
        echo json_encode(['errors' => [['message' => 'GraphQL Target URL is required']]]);
        exit;
    }

    $startTime = microtime(true);
    $ch = curl_init();
    $headersList = ['Content-Type: application/json'];
    if (is_array($customHeaders)) {
        foreach ($customHeaders as $h) {
            if (!empty($h['enabled']) && !empty($h['key'])) {
                $headersList[] = $h['key'] . ': ' . ($h['value'] ?? '');
            }
        }
    }

    $payload = json_encode([
        'query' => $query,
        'variables' => is_string($variables) ? json_decode($variables, true) : $variables
    ]);

    curl_setopt($ch, CURLOPT_URL, $targetUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headersList);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $rawResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $latencyMs = round((microtime(true) - $startTime) * 1000);
    curl_close($ch);

    if ($curlError) {
        http_response_code(502);
        echo json_encode([
            'errors' => [['message' => 'cURL Error: ' . $curlError]],
            'latencyMs' => $latencyMs,
            'status' => 502
        ]);
        exit;
    }

    $decoded = json_decode($rawResponse, true);
    header('Content-Type: application/json');
    http_response_code($httpCode > 0 ? $httpCode : 200);
    echo json_encode([
        'data' => $decoded['data'] ?? null,
        'errors' => $decoded['errors'] ?? null,
        'raw' => $decoded ? null : $rawResponse,
        'status' => $httpCode,
        'latencyMs' => $latencyMs,
        'sizeBytes' => strlen($rawResponse)
    ]);
    exit;
}

// ==============================================================================
// 5. Desktop Application Releases & Distribution Endpoints
// ==============================================================================

if ($action === 'desktop_releases') {
    header('Content-Type: application/json; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $result = saveDesktopRelease($input);
        if (empty($result['success'])) {
            http_response_code(400);
        }
        echo json_encode($result);
        exit;
    }
    $limit = intval($_GET['limit'] ?? 50);
    $releases = getDesktopReleases($limit);
    echo json_encode($releases);
    exit;
}

if ($action === 'desktop_check_update') {
    header('Content-Type: application/json; charset=utf-8');
    $clientVersion = $_GET['version'] ?? '1.0.0';
    $platform = $_GET['platform'] ?? 'win32';
    $update = checkDesktopUpdate($clientVersion, $platform);
    echo json_encode($update);
    exit;
}

if ($action === 'desktop_publish_release') {
    header('Content-Type: application/json; charset=utf-8');
    $result = saveDesktopRelease($input);
    if (empty($result['success'])) {
        http_response_code(400);
    }
    echo json_encode($result);
    exit;
}

if ($action === 'desktop_increment_download') {
    header('Content-Type: application/json; charset=utf-8');
    $relId = $releaseId ?? ($input['id'] ?? ($_GET['id'] ?? ''));
    if (!empty($relId)) {
        incrementDesktopDownload($relId);
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'desktop_download') {
    $platform = strtolower($_GET['platform'] ?? 'windows');
    $format = $_GET['format'] ?? 'exe';
    $version = $_GET['version'] ?? '2.4.0';

    $filename = "CloudPost-Setup-$version.exe";
    if ($platform === 'windows' || $platform === 'win') {
        $filename = ($format === 'zip') ? "CloudPost-Portable-$version.zip" : "CloudPost-Setup-$version.exe";
    } elseif ($platform === 'mac' || $platform === 'darwin') {
        $filename = ($format === 'zip') ? "CloudPost-macOS-$version.zip" : "CloudPost-$version.dmg";
    } elseif ($platform === 'linux') {
        $filename = ($format === 'deb') ? "cloudpost_{$version}_amd64.deb" : (($format === 'tar.gz') ? "cloudpost-{$version}.tar.gz" : "CloudPost-{$version}.AppImage");
    }

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    echo "#!/usr/bin/env node\n/* CloudPost Desktop Standalone Launcher v$version */\nconsole.log('Launching CloudPost Desktop v$version for $platform...');\n";
    exit;
}

// 6. Default / Health status
echo json_encode([
    'status' => 'active',
    'service' => 'CloudPost PHP Request & Response Persistence Engine',
    'version' => '2.5.0',
    'storage' => getDbConnection() ? 'MySQL (cp_history & cp_saas_customers)' : 'File Storage (JSON)'
]);
exit;

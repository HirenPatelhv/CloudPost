        const executeHttpRequestJs = async (requestConfig, forceProxy = false) => {
            const startTime = performance.now();
            let rawUrl = resolveVariables(requestConfig.url || "");
            if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
                rawUrl = "https://" + rawUrl;
            }

            let urlObj;
            try {
                urlObj = new URL(rawUrl);
            } catch (e) {
                try {
                    urlObj = new URL("https://" + rawUrl.replace(/^https?:\/\//, ""));
                } catch (err) {
                    const duration = Math.round(performance.now() - startTime);
                    return {
                        status: 400,
                        statusText: "Bad URL",
                        headers: {},
                        data: "Invalid URL: " + (requestConfig.url || ""),
                        time: duration,
                        size: 0,
                        url: rawUrl,
                        isError: true
                    };
                }
            }

            // Append enabled query parameters
            if (requestConfig.params && Array.isArray(requestConfig.params)) {
                requestConfig.params.forEach(p => {
                    if (p.enabled && p.key && p.key.trim()) {
                        urlObj.searchParams.set(resolveVariables(p.key.trim()), resolveVariables(p.value || ""));
                    }
                });
            }

            // Handle API Key in query parameter if configured
            if ((requestConfig.auth && requestConfig.auth.type === "apiKey") && requestConfig.auth.apiKeyAddTo === "query" && requestConfig.auth.apiKeyName) {
                urlObj.searchParams.set(resolveVariables(requestConfig.auth.apiKeyName), resolveVariables(requestConfig.auth.apiKeyValue || ""));
            }

            const targetUrl = urlObj.toString();

            // Prepare Request Headers
            const reqHeaders = {};
            if (requestConfig.headers) {
                if (Array.isArray(requestConfig.headers)) {
                    requestConfig.headers.forEach(h => {
                        if (h.enabled && h.key && h.key.trim()) {
                            reqHeaders[resolveVariables(h.key.trim())] = resolveVariables(h.value || "");
                        }
                    });
                } else if (typeof requestConfig.headers === "object") {
                    Object.keys(requestConfig.headers).forEach(k => {
                        if (requestConfig.headers[k]) reqHeaders[k] = resolveVariables(requestConfig.headers[k]);
                    });
                }
            }

            // Handle Auth Types
            if ((requestConfig.auth && requestConfig.auth.type === "bearer") && requestConfig.auth.bearerToken) {
                reqHeaders["Authorization"] = "Bearer " + resolveVariables(requestConfig.auth.bearerToken);
            } else if (requestConfig.auth && requestConfig.auth.type === "oauth2") {
                const tok = resolveVariables(requestConfig.auth.oauth2Token || requestConfig.auth.bearerToken || "");
                if (tok) {
                    const prefix = requestConfig.auth.oauth2HeaderPrefix || "Bearer";
                    reqHeaders["Authorization"] = prefix + " " + tok;
                }
            } else if ((requestConfig.auth && requestConfig.auth.type === "basic")) {
                const u = resolveVariables(requestConfig.auth.basicUsername || "");
                const p = resolveVariables(requestConfig.auth.basicPassword || "");
                reqHeaders["Authorization"] = "Basic " + btoa(u + ":" + p);
            } else if ((requestConfig.auth && requestConfig.auth.type === "apiKey") && requestConfig.auth.apiKeyAddTo === "header" && requestConfig.auth.apiKeyName) {
                reqHeaders[resolveVariables(requestConfig.auth.apiKeyName)] = resolveVariables(requestConfig.auth.apiKeyValue || "");
            }

            // Prepare Request Body
            let bodyPayload = undefined;
            const method = (requestConfig.method || "GET").toUpperCase();
            if (method !== "GET" && method !== "HEAD") {
                if (typeof requestConfig.body === "string") {
                    bodyPayload = resolveVariables(requestConfig.body);
                    if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
                        reqHeaders["Content-Type"] = "application/json";
                    }
                } else if ((requestConfig.body && requestConfig.body.type === "json") && requestConfig.body.rawText) {
                    bodyPayload = resolveVariables(requestConfig.body.rawText);
                    if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
                        reqHeaders["Content-Type"] = "application/json";
                    }
                } else if ((requestConfig.body && requestConfig.body.type === "x-www-form-urlencoded")) {
                    const formParams = new URLSearchParams();
                    if (requestConfig.body.urlEncoded && Array.isArray(requestConfig.body.urlEncoded)) {
                        requestConfig.body.urlEncoded.forEach(item => {
                            if (item.enabled && item.key && item.key.trim()) {
                                formParams.append(resolveVariables(item.key.trim()), resolveVariables(item.value || ""));
                            }
                        });
                    }
                    bodyPayload = formParams.toString();
                    if (!reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
                        reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";
                    }
                } else if ((requestConfig.body && requestConfig.body.type === "form-data")) {
                    const formData = new FormData();
                    if (requestConfig.body.formData && Array.isArray(requestConfig.body.formData)) {
                        requestConfig.body.formData.forEach(item => {
                            if (item.enabled && item.key && item.key.trim()) {
                                if (item.type === 'file' && item.file instanceof File) {
                                    formData.append(resolveVariables(item.key.trim()), item.file);
                                } else {
                                    formData.append(resolveVariables(item.key.trim()), resolveVariables(item.value || ""));
                                }
                            }
                        });
                    }
                    bodyPayload = formData;
                    // Do not set Content-Type manually for form-data, let fetch handle the boundary!
                    delete reqHeaders["Content-Type"];
                    delete reqHeaders["content-type"];
                } else if ((requestConfig.body && requestConfig.body.type === "raw") && requestConfig.body.rawText) {
                    bodyPayload = resolveVariables(requestConfig.body.rawText);
                }
            }

            // Direct fetch attempt
            try {
                const fetchOpts = {
                        method: method,
                        headers: reqHeaders,
                        mode: "cors"
                    };
                    if (bodyPayload !== undefined) {
                        fetchOpts.body = bodyPayload;
                    }

                    const response = await fetch(targetUrl, fetchOpts);
                    const duration = Math.round(performance.now() - startTime);

                    const respHeaders = {};
                    response.headers.forEach((val, key) => {
                        respHeaders[key] = val;
                    });

                    const responseText = await response.text();
                    const responseSize = new Blob([responseText]).size;

                    return {
                        status: response.status,
                        statusText: response.statusText || (response.ok ? "OK" : "HTTP " + response.status),
                        headers: respHeaders,
                        data: responseText,
                        time: duration,
                        size: responseSize,
                        url: targetUrl,
                        isError: false,
                        isProxied: false
                    };
                } catch (err) {
                    console.log("[Direct Fetch Blocked by CORS/Network - Retrying via PHP Backend Proxy]:", err.message);
                    if (requestConfig.skipProxy) {
                        const duration = Math.round(performance.now() - startTime);
                        return {
                            status: 0,
                            statusText: "Network Error",
                            headers: {},
                            data: "Direct Network request failed. This may be due to CORS policy, invalid SSL certificate, or a blocked domain.\n\nBrowser Error: " + err.message,
                            time: duration,

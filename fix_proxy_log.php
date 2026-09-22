<?php
$content = file_get_contents('php_shared_hosting/index.php');
$search = '            } catch (proxyErr) {
                console.error("[PHP Proxy Fetch Error]:", proxyErr);
            }';
$replace = '            } catch (proxyErr) {
                console.error("[PHP Proxy Fetch Error]:", proxyErr);
            }
            if (typeof proxyResp !== "undefined" && !proxyResp.ok) {
                console.error("[PHP Proxy Fetch Failed Status]:", proxyResp.status, await proxyResp.text().catch(e=>""));
            }';
$content = str_replace($search, $replace, $content);
file_put_contents('php_shared_hosting/index.php', $content);
echo "Done";

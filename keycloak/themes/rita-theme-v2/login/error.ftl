<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Error - Rita</title>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>
<body>
    <#-- Wrap entire page in Rita's dark gradient background -->
    <div class="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
        <div class="w-full max-w-md">

            <#-- Logo and Header Section -->
            <div class="flex flex-col items-center mb-8">
                <img src="${url.resourcesPath}/img/logo.svg" alt="Rita" class="h-28 w-28 mb-6" />
                <div class="text-center space-y-2">
                    <h1 class="text-4xl font-bold tracking-tighter">
                        ${kcSanitize(msg("errorTitle"))?no_esc}
                    </h1>
                </div>
            </div>

            <#-- Error Message -->
            <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg mb-6">
                <p class="text-sm text-red-300">${kcSanitize(message.summary)?no_esc}</p>
            </div>

            <#-- Action Buttons -->
            <div class="space-y-3">
                <#if !skipLink??>
                    <#if client?? && client.baseUrl?has_content>
                        <a
                            href="${client.baseUrl}"
                            class="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                        >
                            ${kcSanitize(msg("backToApplication"))?no_esc}
                        </a>
                    </#if>
                </#if>

                <#-- Back to Login Link -->
                <div class="text-center text-sm text-gray-400 pt-2">
                    <a href="#" id="login-link" class="text-blue-400 hover:underline font-medium">
                        ← Back to Login
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Dynamically set login URL based on current hostname
        (function() {
            var hostname = window.location.hostname;
            var loginUrl = 'https://onboarding.resolve.io/login'; // Default fallback

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                loginUrl = 'http://localhost:5173/login';
            } else if (hostname.includes('onboarding-auth.resolve.io')) {
                loginUrl = 'https://onboarding.resolve.io/login';
            } else if (hostname.includes('onboarding-prod-auth.resolve.io')) {
                loginUrl = 'https://rita.resolve.io/login';
            }

            // Update the login link href
            var loginLink = document.getElementById('login-link');
            if (loginLink) {
                loginLink.href = loginUrl;
            }
        })();
    </script>
</body>
</html>
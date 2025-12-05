<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign in to RITA</title>
    <link href="${url.resourcesPath}/css/fonts.css" rel="stylesheet" />
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
                <h1 class="text-4xl font-bold tracking-tighter">
                    Sign in to RITA
                </h1>
                <p class="text-gray-400 text-center mt-2">
                    Enter your credentials to continue
                </p>
            </div>

            <#-- Success/Error Messages -->
            <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <#-- Check if this is the "email sent" success message from forgot password -->
                <#assign messageText = message.summary?lower_case>
                <#assign isEmailSentMessage = messageText?contains("email shortly") || messageText?contains("should receive")>

                <#if isEmailSentMessage>
                    <#-- Show email confirmation in green -->
                    <div class="p-4 bg-green-900/20 border border-green-700 rounded-lg mb-4">
                        <p class="text-sm text-green-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                <#else>
                    <#-- Show actual errors in red -->
                    <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg mb-4">
                        <p class="text-sm text-red-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                </#if>
            </#if>

            <#-- Login Form -->
            <#if realm.password>
                <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" class="space-y-4">

                    <#-- Username/Email Field -->
                    <#if !usernameHidden??>
                        <div class="space-y-2">
                            <label for="username" class="text-gray-300">
                                <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                            </label>
                            <input
                                tabindex="1"
                                id="username"
                                name="username"
                                type="text"
                                value="${(login.username!'')}"
                                autocomplete="username"
                                autofocus
                                aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                class="h-11 w-full bg-black/20 text-white border border-gray-700 rounded-md px-3 py-1 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="<#if !realm.loginWithEmailAllowed>Enter username<#else>you@acme.com</#if>"
                            />
                            <#if messagesPerField.existsError('username','password')>
                                <p class="text-sm text-red-400">
                                    ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </p>
                            </#if>
                        </div>
                    </#if>

                    <#-- Password Field -->
                    <div class="space-y-2">
                        <label for="password" class="text-gray-300">
                            ${msg("password")}
                        </label>
                        <input
                            tabindex="2"
                            id="password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                            class="h-11 w-full bg-black/20 text-white border border-gray-700 rounded-md px-3 py-1 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="••••••••"
                        />
                        <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                            <p class="text-sm text-red-400">
                                ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                            </p>
                        </#if>
                    </div>

                    <#-- Remember Me & Forgot Password -->
                    <div class="flex items-center justify-between">
                        <#if realm.rememberMe && !usernameHidden??>
                            <div class="flex items-center">
                                <input
                                    tabindex="3"
                                    id="rememberMe"
                                    name="rememberMe"
                                    type="checkbox"
                                    <#if login.rememberMe??>checked</#if>
                                    class="h-4 w-4 rounded border-gray-700 bg-black/20 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
                                />
                                <label for="rememberMe" class="ml-2 text-sm text-gray-300">
                                    ${msg("rememberMe")}
                                </label>
                            </div>
                        </#if>

                        <#if realm.resetPasswordAllowed>
                            <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="text-sm text-blue-400 hover:underline font-medium">
                                ${msg("doForgotPassword")}
                            </a>
                        </#if>
                    </div>

                    <#-- Hidden credential ID field -->
                    <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>

                    <#-- Submit Button -->
                    <button
                        tabindex="4"
                        name="login"
                        id="kc-login"
                        type="submit"
                        class="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ${msg("doLogIn")}
                    </button>

                    <#-- External Signup Link -->
                    <div class="text-center text-sm text-gray-400 pt-4">
                        Don't have an account?
                        <a tabindex="6" href="#" id="signup-link" class="text-blue-400 hover:underline font-medium ml-1">
                            Sign up
                        </a>
                    </div>
                </form>
            </#if>

            <#-- Social Providers (if configured) - Hidden with Tailwind -->
            <#if realm.password && social.providers??>
                <div class="hidden mt-6">
                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-700"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-transparent text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <div class="mt-6 grid grid-cols-1 gap-3">
                        <#list social.providers as p>
                            <a
                                id="social-${p.alias}"
                                href="${p.loginUrl}"
                                class="w-full h-11 inline-flex items-center justify-center gap-2 bg-black/20 text-white border border-gray-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                                <#if p.iconClasses?has_content>
                                    <i class="${p.iconClasses!}" aria-hidden="true"></i>
                                </#if>
                                <span>${p.displayName!}</span>
                            </a>
                        </#list>
                    </div>
                </div>
            </#if>
        </div>
    </div>

    <script>
        // Dynamically set signup URL based on current hostname
        (function() {
            var hostname = window.location.hostname;
            var signupUrl = 'https://onboarding.resolve.io/login'; // Default fallback

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                signupUrl = 'http://localhost:5173/login';
            } else if (hostname.includes('onboarding-auth.resolve.io')) {
                signupUrl = 'https://onboarding.resolve.io/login';
            } else if (hostname.includes('onboarding-prod-auth.resolve.io')) {
                signupUrl = 'https://rita.resolve.io/login';
            }

            // Update the signup link href
            var signupLink = document.getElementById('signup-link');
            if (signupLink) {
                signupLink.href = signupUrl;
            }
        })();
    </script>
</body>
</html>

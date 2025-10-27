<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Update Password - Rita</title>
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
                    ${msg("updatePasswordTitle")}
                </h1>
                <p class="text-gray-400 text-center mt-2">
                    Create a strong password for your account
                </p>
            </div>

            <#-- Error/Warning Messages -->
            <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <#if message.type = 'success'>
                    <div class="p-4 bg-green-900/20 border border-green-700 rounded-lg mb-4">
                        <p class="text-sm text-green-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                <#elseif message.type = 'warning'>
                    <div class="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg mb-4">
                        <p class="text-sm text-yellow-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                <#elseif message.type = 'error'>
                    <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg mb-4">
                        <p class="text-sm text-red-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                <#elseif message.type = 'info'>
                    <div class="p-4 bg-blue-900/20 border border-blue-700 rounded-lg mb-4">
                        <p class="text-sm text-blue-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                <#else>
                    <div class="p-4 bg-gray-900/20 border border-gray-700 rounded-lg mb-4">
                        <p class="text-sm text-gray-300">${kcSanitize(message.summary)?no_esc}</p>
                    </div>
                </#if>
            </#if>

            <#-- Password Update Form -->
            <form id="kc-passwd-update-form" action="${url.loginAction}" method="post" class="space-y-4">

                <#-- New Password Field -->
                <div class="space-y-2">
                    <label for="password-new" class="text-gray-300">
                        ${msg("passwordNew")}
                    </label>
                    <div class="relative">
                        <input
                            tabindex="1"
                            type="password"
                            id="password-new"
                            name="password-new"
                            autocomplete="new-password"
                            autofocus
                            aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                            class="h-11 w-full bg-black/20 text-white border border-gray-700 rounded-md px-3 py-1 pr-12 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Enter new password"
                        />
                        <button
                            type="button"
                            id="toggle-password-new"
                            tabindex="-1"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200"
                            aria-label="Show password"
                        >
                            <svg id="eye-icon-new" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    </div>
                    <#if messagesPerField.existsError('password')>
                        <p class="text-sm text-red-400">
                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                        </p>
                    </#if>
                </div>

                <#-- Confirm Password Field -->
                <div class="space-y-2">
                    <label for="password-confirm" class="text-gray-300">
                        ${msg("passwordConfirm")}
                    </label>
                    <div class="relative">
                        <input
                            tabindex="2"
                            type="password"
                            id="password-confirm"
                            name="password-confirm"
                            autocomplete="new-password"
                            aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                            class="h-11 w-full bg-black/20 text-white border border-gray-700 rounded-md px-3 py-1 pr-12 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Confirm new password"
                        />
                        <button
                            type="button"
                            id="toggle-password-confirm"
                            tabindex="-1"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200"
                            aria-label="Show password"
                        >
                            <svg id="eye-icon-confirm" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    </div>
                    <#if messagesPerField.existsError('password-confirm')>
                        <p class="text-sm text-red-400">
                            ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                        </p>
                    </#if>
                </div>

                <#-- Logout Other Sessions Checkbox -->
                <div class="flex items-center space-x-2 py-2">
                    <input
                        tabindex="3"
                        type="checkbox"
                        id="logout-sessions"
                        name="logout-sessions"
                        value="on"
                        checked
                        class="w-4 h-4 rounded border-gray-700 bg-black/20 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
                    />
                    <label for="logout-sessions" class="text-sm text-gray-300">
                        ${msg("logoutOtherSessions")}
                    </label>
                </div>

                <#-- Submit and Cancel Buttons -->
                <div class="space-y-3 pt-2">
                    <#if isAppInitiatedAction??>
                        <#-- User-initiated: Show both Submit and Cancel -->
                        <button
                            tabindex="4"
                            type="submit"
                            class="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ${msg("doSubmit")}
                        </button>
                        <button
                            tabindex="5"
                            type="submit"
                            name="cancel-aia"
                            value="true"
                            class="w-full h-12 text-base font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            ${msg("doCancel")}
                        </button>
                    <#else>
                        <#-- Required action: Only Submit button -->
                        <button
                            tabindex="4"
                            type="submit"
                            class="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ${msg("doSubmit")}
                        </button>
                    </#if>
                </div>
            </form>
        </div>
    </div>

    <#-- Password Visibility Toggle Script -->
    <script>
        (function() {
            'use strict';

            function togglePasswordVisibility(inputId, buttonId, iconId) {
                const input = document.getElementById(inputId);
                const button = document.getElementById(buttonId);
                const icon = document.getElementById(iconId);

                if (!input || !button || !icon) {
                    console.warn('Password toggle elements not found:', inputId);
                    return;
                }

                button.addEventListener('click', function(e) {
                    e.preventDefault();

                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

                    // Toggle icon between eye-open and eye-closed
                    if (isPassword) {
                        // Eye closed (password visible)
                        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />';
                    } else {
                        // Eye open (password hidden)
                        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />';
                    }
                });
            }

            // Initialize password visibility toggles for both fields
            document.addEventListener('DOMContentLoaded', function() {
                togglePasswordVisibility('password-new', 'toggle-password-new', 'eye-icon-new');
                togglePasswordVisibility('password-confirm', 'toggle-password-confirm', 'eye-icon-confirm');
            });

            // Fallback if DOMContentLoaded already fired
            if (document.readyState === 'loading') {
                // DOMContentLoaded will handle it
            } else {
                togglePasswordVisibility('password-new', 'toggle-password-new', 'eye-icon-new');
                togglePasswordVisibility('password-confirm', 'toggle-password-confirm', 'eye-icon-confirm');
            }
        })();
    </script>
</body>
</html>

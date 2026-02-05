<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset Password - Rita</title>
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
                <div class="text-center space-y-2">
                    <h1 class="text-4xl font-bold tracking-tighter">
                        ${msg("emailForgotTitle")}
                    </h1>
                    <p class="text-gray-400">
                        ${msg("emailInstruction")}
                    </p>
                </div>
            </div>

            <#-- Only show error messages for username field, hide the success "email sent" message -->
            <#if messagesPerField.existsError('username')>
                <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg mb-4">
                    <p class="text-sm text-red-300">${kcSanitize(messagesPerField.get('username'))?no_esc}</p>
                </div>
            </#if>

            <#-- Password Reset Form -->
            <form id="kc-reset-password-form" action="${url.loginAction}" method="post" class="space-y-4">

                <#-- Username/Email Field -->
                <div class="space-y-2">
                    <label for="username" class="text-gray-300">
                        <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                    </label>
                    <input
                        tabindex="1"
                        id="username"
                        name="username"
                        type="text"
                        value="${(auth.attemptedUsername!'')}"
                        autofocus
                        autocomplete="username"
                        aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
                        class="h-11 w-full bg-black/20 text-white border border-gray-700 rounded-md px-3 py-1 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="<#if !realm.loginWithEmailAllowed>Enter username<#else>you@acme.com</#if>"
                    />
                    <#if messagesPerField.existsError('username')>
                        <p class="text-sm text-red-400">
                            ${kcSanitize(messagesPerField.get('username'))?no_esc}
                        </p>
                    </#if>
                </div>

                <#-- Submit Button -->
                <button
                    tabindex="2"
                    type="submit"
                    class="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ${msg("doSubmit")}
                </button>

                <#-- Back to Login Link -->
                <div class="text-center text-sm text-gray-400 pt-2">
                    <a tabindex="3" href="${url.loginUrl}" class="text-blue-400 hover:underline font-medium">
                        ← Back to Login
                    </a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>

<#import "template.ftl" as layout>
<@layout.emailLayout>
    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-radius: 12px; overflow: hidden;">

                    <!-- Header with Gradient Background -->
                    <tr>
                        <td align="center" style="padding: 48px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.5px;">
                                Rita-Go
                            </h1>
                            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0 0; font-weight: 400;">
                                Secure Password Management
                            </p>
                        </td>
                    </tr>

                    <!-- Content Section -->
                    <tr>
                        <td style="padding: 48px 40px;">
                            <h2 style="color: #1a202c; font-size: 26px; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; line-height: 1.3;">
                                ${msg("passwordResetTitle")}
                            </h2>

                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                ${msg("passwordResetBody")}
                            </p>

                            <!-- Expiry Notice -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 32px 0; background-color: #f7fafc; border-left: 4px solid #667eea; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <p style="color: #2d3748; font-size: 14px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                            ⏱️ ${msg("passwordResetExpiry", linkExpirationFormatter(linkExpiration))}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Reset Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${link}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); transition: all 0.3s ease;">
                                            ${msg("passwordResetButton")}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link Section -->
                            <div style="margin: 0 0 24px 0;">
                                <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                    ${msg("passwordResetAlternative")}
                                </p>
                                <p style="color: #a0aec0; font-size: 12px; line-height: 1.5; margin: 0; padding: 12px; background-color: #f7fafc; border-radius: 4px; font-family: 'Courier New', Courier, monospace; word-break: break-all;">
                                    ${link}
                                </p>
                            </div>

                            <!-- Security Notice -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0; background-color: #fffaf0; border: 1px solid #fbd38d; border-radius: 4px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <p style="color: #744210; font-size: 13px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5;">
                                            🔒 ${msg("passwordResetSecurityNote")}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Ignore Notice -->
                            <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                ${msg("passwordResetIgnore")}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #f7fafc; border-top: 1px solid #e2e8f0;">
                            <p style="color: #718096; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                ${msg("emailFooter")}
                            </p>
                            <p style="color: #a0aec0; font-size: 12px; line-height: 1.5; margin: 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                © ${.now?string('yyyy')} Rita-Go. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</@layout.emailLayout>
<#import "template.ftl" as layout>
<@layout.emailLayout>
    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-radius: 12px; overflow: hidden;">

                    <!-- Header with Background -->
                    <tr>
                        <td align="center" style="padding: 48px 40px; background-color: #0d1637;">
                            <!--[if gte mso 9]>
                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:200px;">
                            <v:fill type="gradient" color="#0d1637" color2="#1a2549" angle="135" />
                            <v:textbox inset="0,0,0,0">
                            <![endif]-->
                            <div>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td align="center" style="padding: 0;">
                                            <img src="https://rita-go-assets.s3.us-east-1.amazonaws.com/pw_reset_logo.png" alt="Rita-Go" style="display: block; width: 113px; height: 70px; margin: 0 auto 16px auto; border: 0;">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                                                Password Reset
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <!--[if gte mso 9]>
                            </v:textbox>
                            </v:rect>
                            <![endif]-->
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
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 32px 0; background-color: #f7fafc; border-left: 4px solid #1a2549; border-radius: 4px;">
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
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="16%" stroke="f" fillcolor="#0d1637">
                                        <w:anchorlock/>
                                        <center>
                                        <![endif]-->
                                        <a href="${link}" style="display: inline-block; padding: 16px 48px; background-color: #0d1637; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; box-shadow: 0 4px 6px rgba(13, 22, 55, 0.25); mso-hide: all;">
                                            ${msg("passwordResetButton")}
                                        </a>
                                        <!--[if mso]>
                                        </center>
                                        </v:roundrect>
                                        <![endif]-->
                                    </td>
                                </tr>
                            </table>

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
                </table>
            </td>
        </tr>
    </table>
</@layout.emailLayout>
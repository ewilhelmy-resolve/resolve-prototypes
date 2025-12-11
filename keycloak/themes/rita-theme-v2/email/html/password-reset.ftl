<#import "template.ftl" as layout>
<@layout.emailLayout>
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${msg("passwordResetSubject")}</title>
  <style>
    table, td { border-collapse: collapse !important; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    p { margin: 0; padding: 0; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f2f4f8; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f2f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f2f4f8; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#0d1637; padding:48px 40px;">
              <img src="https://rita-go-assets.s3.us-east-1.amazonaws.com/pw_reset_logo.png" alt="Rita-Go" width="113" height="70" style="display:block; margin:0 auto 16px auto;">
              <p style="color:#ffffff; opacity:0.9; font-size:16px; font-weight:400;">
                Password Reset
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:48px 40px;">
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
              <table role="presentation" align="center" style="margin:0 auto 32px auto;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="16%" stroke="f" fillcolor="#0d1637">
                      <w:anchorlock/>
                      <center style="color:#ffffff; font-family:'Segoe UI', Arial, sans-serif; font-size:16px; font-weight:600;">
                        ${msg("passwordResetButton")}
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${link}" style="display: inline-block; padding: 16px 48px; background-color: #0d1637; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; box-shadow: 0 4px 6px rgba(13, 22, 55, 0.25); mso-hide: all;">
                        ${msg("passwordResetButton")}
                    </a>
                    <!--<![endif]-->
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

</body>
</html>
</@layout.emailLayout>

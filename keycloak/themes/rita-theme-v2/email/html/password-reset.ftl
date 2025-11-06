<#import "template.ftl" as layout>
<@layout.emailLayout>
<p>${msg("passwordResetBodyHtml", link, linkExpiration, realmName, linkExpirationFormatter(linkExpiration))}</p>
</@layout.emailLayout>
# Evening Invitation for Kit

`evening-invitation-kit.html` is a reusable Kit HTML email template. The Superthoughts masthead, decorative portal, and footer are part of the template. The subject, preheader, heading, session title, CTA, body, and signature belong in each Kit email. Use a regular body paragraph for Josh’s signature.

## Install and preview

In Kit, open **Email Templates → New Email Template → Create HTML Template**. Paste the entire HTML file, name it **Superthoughts — Evening Invitation**, and save. Select this template for the intended email or sequence and use Kit’s preview with real message content. Confirm the configured mailing address and the two recipient links in the delivered test. [Kit HTML template guide](https://help.kit.com/en/articles/2810363-creating-a-custom-html-email-template)

The template styles regular content links and Kit’s `.button` class. To use a custom CTA in an HTML block, replace the sample URL and label in this snippet. Keep the inline styles for email clients that remove embedded CSS.

```html
<a class="evening-button" href="https://superthoughts.com/still-enough.html"
   style="display:inline-block;box-sizing:border-box;max-width:100%;padding:11px 20px;border-radius:4px;background-color:#e7d4b4;color:#202b25;font-family:Manrope,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;line-height:22px;text-align:center;text-decoration:none;">Begin listening</a>
```

## Rendering checks

The template uses a fluid table capped at 600 px, solid forest and ivory colors, and Arial or Helvetica when the Manrope web font is unavailable. The portal has a solid fallback. Gmail’s `color-scheme` hint requests the authored palette for supported Google-account inboxes on mobile. Color treatment can still vary by client and account. [Gmail CSS support](https://developers.google.com/workspace/gmail/design/css)

| Inbox | Check in light and dark appearance |
| --- | --- |
| Gmail on iOS | Body, CTA and footer contrast, color inversion, and wrapping at narrow widths |
| Gmail on Android | Body, CTA and footer contrast, gradient fallback, and wrapping at narrow widths |
| Apple Mail on iOS and macOS | Manrope or fallback, portal rendering, and linked text legibility |
| Gmail on the web | 600 px width cap, fallback font, and rendered content hierarchy |

Local Chromium checks with sample content confirmed a 320 px layout without horizontal overflow, the 600 px width cap, and a 44 px CTA. The 320 px check also passed with embedded styles removed and the inline CTA styles applied.

Use an actual Kit inbox delivery to verify these clients, including the intended sequence content, any custom CTA, the mailing address, and the recipient-specific links. Check a narrow layout at 320 px. This template has not been installed in Kit or sent to an inbox.

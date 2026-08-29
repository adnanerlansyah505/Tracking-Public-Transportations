export interface BaseEmailTemplateOptions {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  fallbackUrl?: string;
  footerText?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderParagraphs = (body: string) =>
  body
    .split('\n')
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.65;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

export function renderBaseEmailTemplate(options: BaseEmailTemplateOptions) {
  const fallbackUrl = options.fallbackUrl ?? options.ctaUrl;
  const footerText = options.footerText ?? 'This is an message from Public Tracking Transportation. If you did not request this email, you can safely ignore it.';

  return `<!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${escapeHtml(options.title)}</title>
        </head>
        <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.title)}</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
            <tr>
                <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                    <tr>
                    <td style="padding:28px 32px 20px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 8px;color:#0f766e;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Tracking Public Transportation</p>
                        <h1 style="margin:0;color:#0f172a;font-size:26px;line-height:1.25;font-weight:700;">${escapeHtml(options.title)}</h1>
                    </td>
                    </tr>
                    <tr>
                    <td style="padding:28px 32px;">
                        ${renderParagraphs(options.body)}
                        ${options.ctaText && options.ctaUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td><a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:12px 20px;border-radius:10px;">${escapeHtml(options.ctaText)}</a></td></tr></table>` : ''}
                        ${fallbackUrl ? `<p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.6;">If the button does not work, copy and paste this URL into your browser:<br /><a href="${escapeHtml(fallbackUrl)}" style="color:#0f766e;word-break:break-all;">${escapeHtml(fallbackUrl)}</a></p>` : ''}
                    </td>
                    </tr>
                    <tr>
                    <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(footerText)}</p>
                    </td>
                    </tr>
                </table>
                </td>
            </tr>
            </table>
        </body>
    </html>`;
}

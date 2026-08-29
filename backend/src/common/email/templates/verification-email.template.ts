import { renderBaseEmailTemplate } from './base-email.template';

export interface VerificationEmailTemplateOptions {
  verificationUrl: string;
  recipientName?: string;
  expiresIn?: Date;
}

export function renderVerificationEmail(options: VerificationEmailTemplateOptions) {
  const greeting = options.recipientName ? `Hi ${options.recipientName},` : 'Hi,';
  const expires = options.expiresIn ?? '24 hours';
  const body = `${greeting}\nPlease verify your email address to finish setting up your Public Tracking Transportation account. This link expires in ${expires}.`;

  return {
    subject: 'Verify your email address',
    html: renderBaseEmailTemplate({
      title: 'Verify your email address',
      body,
      ctaText: 'Verify email',
      ctaUrl: options.verificationUrl,
      fallbackUrl: options.verificationUrl,
      footerText: 'You received this because an LMS account was created with this email address.',
    }),
    text: `${body}\n\nVerify email: ${options.verificationUrl}\n\nYou received this because an PTA account was created with this email address.`,
  };
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { renderVerificationEmail, type VerificationEmailTemplateOptions } from './templates/verification-email.template';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.config.get<string | number>('SMTP_PORT', 587));
    const secure = this.config.get<string | boolean>('SMTP_SECURE', false) === true || this.config.get<string>('SMTP_SECURE') === 'true';
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'Public Tracking Transportation');
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL', user ?? 'no-reply@example.com');

    this.from = `"${fromName}" <${fromEmail}>`;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendMail(options: SendEmailOptions) {
    const result = await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    this.logger.debug(`Email sent to ${options.to}: ${result.messageId}`);
    return result;
  }

  sendVerificationEmail(to: string, options: VerificationEmailTemplateOptions) {
    const template = renderVerificationEmail(options);
    return this.sendMail({ to, ...template });
  }

//   sendResetPasswordEmail(to: string, options: ResetPasswordEmailTemplateOptions) {
//     const template = renderResetPasswordEmail(options);
//     return this.sendMail({ to, ...template });
//   }
}

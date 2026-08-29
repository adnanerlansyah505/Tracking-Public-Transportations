import { BadRequestException } from '@nestjs/common';

export interface UploadFileRule {
  field: string;
  required?: boolean;
  maxSize?: number;
  allowedMimeTypes?: ReadonlySet<string> | RegExp;
  invalidMessage?: string;
}

/**
 * Validates uploaded files and throws the application's standard validation
 * response payload. Use it in any service that accepts multipart uploads.
 */
export function validateUploadFiles(
  files: Record<string, Express.Multer.File | undefined>,
  rules: UploadFileRule[],
): void {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const file = files[rule.field];

    if (!file) {
      if (rule.required) {
        errors[rule.field] = `${rule.field} is required`;
      }
      continue;
    }

    const isAllowedType = !rule.allowedMimeTypes || (
      rule.allowedMimeTypes instanceof RegExp
        ? rule.allowedMimeTypes.test(file.mimetype)
        : rule.allowedMimeTypes.has(file.mimetype)
    );
    const isAllowedSize = !rule.maxSize || file.size <= rule.maxSize;

    if (!isAllowedType || !isAllowedSize) {
      errors[rule.field] = rule.invalidMessage ?? `${rule.field} is invalid`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestException({
      code: 'validation',
      message: 'Validation failed',
      errors,
    });
  }
}

// file.constants.ts

export const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

export const IMAGE_MIME_TYPES =
  /(jpg|jpeg|png|webp)$/;

export const MAX_DOCUMENT_SIZE =
  10 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

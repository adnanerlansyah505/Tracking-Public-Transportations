// shared/error-handling/error-content.ts

export interface ErrorContent {
    title: string
    description: string
}

export const ERROR_CONTENT: Record<number, ErrorContent> = {
    401: {
        title: "Unauthorized",
        description: "Anda harus login terlebih dahulu untuk mengakses halaman ini."
    },
    403: {
        title: "Forbidden",
        description: "Anda tidak memiliki izin untuk mengakses halaman ini."
    },
    404: {
        title: "Page Not Found",
        description: "Halaman yang Anda cari tidak tersedia atau telah dipindahkan."
    },
    422: {
        title: "Invalid Data",
        description: "Permintaan tidak dapat diproses karena data yang dikirim tidak valid."
    },
    500: {
        title: "Internal Server Error",
        description: "Terjadi kesalahan pada server kami. Silahkan coba beberapa saat lagi."
    },
    503: {
        title: "Service Unavailable",
        description: "Server sedang sibuk atau maintenance."
    }
}

export const DEFAULT_ERROR_CONTENT: ErrorContent = {
    title: "Terjadi Kesalahan",
    description: "Terjadi suatu kesalahan pada server, silahkan coba beberapa saat lagi."
}

export function getErrorContent(statusCode: number): ErrorContent {
    return ERROR_CONTENT[statusCode] ?? DEFAULT_ERROR_CONTENT
}

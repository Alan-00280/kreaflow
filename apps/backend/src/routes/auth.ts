import { createRoute, z } from "@hono/zod-openapi"

export const loginRequestSchema = z.object({
  email: z.string()
    .email({ message: "Format email tidak valid" })
    .openapi({ description: "Alamat email internal store", example: "admin@mamang.geming" }),
  password: z.string()
    .min(6, { message: "Password minimal 6 karakter" })
    .openapi({ description: "Kata sandi akun", example: "playergaminggokil112233" })
}).openapi('LoginRequest')

export const loginResponseSchema = z.object({
  id: z.string().openapi({ description: "User ID (String)", example: "1" }),
  name: z.string().openapi({ description: "Nama Pengguna", example: "System Administrator" }),
  role: z.string().openapi({ description: "Role Pengguna", example: "admin" })
}).openapi('LoginResponse')

export const errorResponseSchema = z.object({
  error: z.string().openapi({ description: "Pesan Error", example: "Email atau password salah" })
}).openapi('ErrorResponse')

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'User Login',
  description: 'Autentikasi operator atau admin menggunakan email dan password untuk mendapatkan cookie sesi.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: loginResponseSchema,
        },
      },
      description: 'Login berhasil, token disimpan di cookie',
    },
    401: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Autentikasi gagal (email/password salah)',
    },
    400: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Request tidak valid atau data login tidak lengkap',
    },
    500: {
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
      description: 'Terjadi kesalahan internal server',
    }
  },
})

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string()
    .nonempty({ message: 'Email tidak boleh kosong' })
    .email({ message: 'Format email tidak valid' }),
  password: z.string()
    .nonempty({ message: 'Password tidak boleh kosong' })
    .min(6, { message: 'Password minimal 6 karakter' })
})

export type LoginInput = z.infer<typeof loginSchema>
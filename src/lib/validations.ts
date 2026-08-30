import { z } from "zod";
import { THEME_COLOR_IDS, THEME_MODES } from "@/lib/theme";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(60).optional(),
});

export const logSchema = z.object({
  albumId: z.string().min(1),
  rating: z
    .number()
    .min(0.5)
    .max(5)
    .multipleOf(0.5)
    .nullable()
    .optional(),
  reviewText: z.string().max(5000).nullable().optional(),
  listenedAt: z.string().optional(),
  isRelisten: z.boolean().optional(),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const profileSchema = z.object({
  name: z.string().max(60).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export const fiveFavesSchema = z.object({
  albumIds: z.array(z.string().min(1)).max(5),
});

export const settingsSchema = z.object({
  themeColor: z.enum(THEME_COLOR_IDS),
  themeMode: z.enum(THEME_MODES),
});

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
  tags: z.array(z.string().min(1).max(30)).max(8).optional(),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const profileSchema = z.object({
  name: z.string().max(60).optional(),
  bio: z.string().max(500).optional(),
  // Avatars are set only by uploading; this field can only clear one.
  avatarUrl: z.literal("").optional(),
});

export const fiveFavesSchema = z.object({
  albumIds: z.array(z.string().min(1)).max(5),
});

export const settingsSchema = z.object({
  themeColor: z.enum(THEME_COLOR_IDS),
  themeMode: z.enum(THEME_MODES),
});

export const DM_PRIVACY_OPTIONS = ["everyone", "followers", "none"] as const;

export const preferencesSchema = z.object({
  isPrivate: z.boolean().optional(),
  dmPrivacy: z.enum(DM_PRIVACY_OPTIONS).optional(),
  notifyOnFollow: z.boolean().optional(),
  notifyOnLike: z.boolean().optional(),
  notifyOnComment: z.boolean().optional(),
  notifyOnMessage: z.boolean().optional(),
  notifyOnRelease: z.boolean().optional(),
  notifyOnAnniversary: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

export const rankedListSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const rankedListItemSchema = z.object({
  albumId: z.string().min(1),
  note: z.string().max(280).nullable().optional(),
});

export const moveItemSchema = z.object({
  afterItemId: z.string().min(1).nullable(),
});

export const lastfmImportSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "That doesn't look like a Last.fm username"),
});

export const reviewDecisionSchema = z.object({
  albumId: z.string().min(1).nullable(),
});

export const messageSchema = z.object({
  text: z.string().max(2000).nullable().optional(),
  sharedAlbumId: z.string().optional(),
  sharedLogId: z.string().optional(),
});

export const trackRatingSchema = z.object({
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable(),
});

/**
 * Zillow photo URLs encode their size in a suffix, e.g.
 *   https://photos.zillowstatic.com/fp/<hash>-p_e.jpg            (search thumbnail)
 *   https://photos.zillowstatic.com/fp/<hash>-uncropped_scaled_within_1536_1152.jpg
 * Rewriting the suffix lets cards load small images and galleries load big ones,
 * whichever variant we happened to store. Other hosts are returned unchanged.
 */
const ZILLOW_PHOTO = /^(https:\/\/photos\.zillowstatic\.com\/fp\/[a-f0-9]+)-[a-z0-9_]+\.(jpg|webp)$/i;

const SIZES = {
  card: "cc_ft_576",
  thumb: "cc_ft_384",
  large: "uncropped_scaled_within_1536_1152",
} as const;

export function photoUrl(url: string, size: keyof typeof SIZES) {
  const match = ZILLOW_PHOTO.exec(url);
  return match ? `${match[1]}-${SIZES[size]}.${match[2]}` : url;
}

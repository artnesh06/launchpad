/**
 * Collection Slug Mapping
 * Maps user-friendly slugs to contract addresses
 */

export const COLLECTION_SLUGS: Record<string, string> = {
  'megarebel': '0xeb8a15bb1b9842bee34caf5823bc7a7017c0d4ac',
  // Add more collections here as needed
  // 'slug-name': '0xcontractaddress',
};

/**
 * Get contract address from slug
 * Returns the contract address if slug exists, otherwise returns the input (assuming it's already a contract address)
 */
export function getContractAddressFromSlug(slugOrAddress: string): string {
  const normalized = slugOrAddress.toLowerCase();
  return COLLECTION_SLUGS[normalized] || slugOrAddress;
}

/**
 * Get slug from contract address
 * Returns the slug if found, otherwise returns null
 */
export function getSlugFromContractAddress(contractAddress: string): string | null {
  const normalized = contractAddress.toLowerCase();
  const entry = Object.entries(COLLECTION_SLUGS).find(
    ([_, address]) => address.toLowerCase() === normalized
  );
  return entry ? entry[0] : null;
}

/**
 * Check if a string is a slug (not a contract address)
 */
export function isSlug(input: string): boolean {
  return input.toLowerCase() in COLLECTION_SLUGS;
}

/**
 * Get the URL path for a collection (uses slug if available, otherwise contract address)
 * Use this helper when creating links to collection pages
 */
export function getCollectionPath(contractAddress: string): string {
  const slug = getSlugFromContractAddress(contractAddress);
  return `/l/${slug || contractAddress}`;
}

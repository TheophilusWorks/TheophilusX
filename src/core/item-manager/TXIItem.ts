export interface TXIItem {
  name: string,
  description: string,
  price: number,
  levelRequirement: number,
  totalExpRequirement: number,
  duration: Date | null; // null == unlimited duration
  expiresAt: Date | null; // null == no expiry
}

export interface TXIItem {
  name: string;
  description: string;
  duration: Date | null,
  expiresAt: Date | null,
  levelRequirement: number;
  totalExpRequirement: number;
  price: number;
}

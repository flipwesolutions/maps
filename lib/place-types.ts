export interface SearchPlace {
  id: string;
  name: string;
  subtitle: string;
  coordinates: [number, number]; // [lng, lat]
  type?: string;
}

export interface SearchOptions {
  proximity?: [number, number];
  region?: import("./regions").SearchRegion;
  limit?: number;
}

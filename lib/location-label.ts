/** Short label for pickup field: street/road + area (not "My location"). */
export function formatLocationLabel(
  address?: Record<string, string>,
  displayName?: string
): string {
  const road = [
    address?.house_number,
    address?.road ||
      address?.pedestrian ||
      address?.residential ||
      address?.footway ||
      address?.street,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const area =
    address?.suburb ||
    address?.neighbourhood ||
    address?.quarter ||
    address?.city_district ||
    address?.locality;

  const city =
    address?.city ||
    address?.town ||
    address?.village ||
    address?.county;

  if (road && area) return `${road}, ${area}`;
  if (road && city) return `${road}, ${city}`;
  if (road) return road;
  if (area && city) return `${area}, ${city}`;
  if (area) return area;
  if (city) return city;
  if (address?.state) return address.state;

  if (displayName) {
    const parts = displayName
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
    if (parts.length === 1) return parts[0];
  }

  return "";
}

export function formatCoordsLabel(coordinates: [number, number]): string {
  const [lng, lat] = coordinates;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

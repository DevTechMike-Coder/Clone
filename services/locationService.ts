import * as Location from "expo-location";

/**
 * Place search + reverse geocoding for the post composer.
 *
 * Forward search uses Photon (OpenStreetMap data) — keyless and
 * CORS/UA-friendly, unlike Nominatim which needs an identifying
 * User-Agent that RN's fetch cannot reliably set on Android.
 * "Current location" uses expo-location's native reverse geocoder.
 */

export type PlaceResult = {
  id: string;
  /** Short label shown/persisted on the post (e.g. "Lekki, Lagos, Nigeria"). */
  label: string;
  /** Secondary line for the list row. */
  detail: string;
};

const PHOTON_URL = "https://photon.komoot.io/api/";

type PhotonFeature = {
  properties?: {
    osm_id?: number;
    name?: string;
    city?: string;
    state?: string;
    county?: string;
    country?: string;
    type?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

function toPlaceResult(f: PhotonFeature, index: number): PlaceResult | null {
  const p = f.properties ?? {};
  const primary = p.name || p.city;
  if (!primary) return null;

  const secondaries = [p.city !== primary ? p.city : undefined, p.state, p.country]
    .filter(Boolean) as string[];
  // De-dupe consecutive repeats (name == state etc.)
  const parts = [primary, ...secondaries].filter(
    (part, i, arr) => arr.indexOf(part) === i
  );

  return {
    id: `${p.osm_id ?? "x"}-${index}-${f.geometry?.coordinates?.join(",") ?? ""}`,
    label: parts.slice(0, 3).join(", "),
    detail: parts.slice(3).join(", ") || p.type || "",
  };
}

export const locationService = {
  /** Free-text place search ("lagos", "eiffel tower"). Throws on network errors. */
  async searchPlaces(query: string): Promise<PlaceResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const url =
      `${PHOTON_URL}?q=${encodeURIComponent(trimmed)}&limit=8` +
      `&lang=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Place search failed (${res.status})`);

    const json = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    return (json.features ?? [])
      .map(toPlaceResult)
      .filter((r): r is PlaceResult => !!r)
      .filter((r) => {
        const key = r.label.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  },

  /**
   * "City, Country" for the device position.
   * Returns null when permission is denied or geocoding finds nothing.
   */
  async getCurrentPlace(): Promise<string | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    if (!place) return null;

    const city = place.city || place.region || place.subregion;
    const parts = [city, place.country].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  },
};

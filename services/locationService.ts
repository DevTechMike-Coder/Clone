import * as Location from "expo-location";

export type RealLocationItem = {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  latitude?: number;
  longitude?: number;
};

export const locationService = {
  // Request device location permissions
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (err) {
      console.warn("Location permission error:", err);
      return false;
    }
  },

  // Get current real-time GPS location and reverse geocode
  async getCurrentLocation(): Promise<RealLocationItem | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return null;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const geocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];
        const primaryName =
          place.name ||
          place.district ||
          place.street ||
          place.city ||
          place.subregion ||
          "Current Location";

        const parts: string[] = [];
        if (place.city && place.city !== primaryName) parts.push(place.city);
        if (place.region && place.region !== primaryName && place.region !== place.city) {
          parts.push(place.region);
        }
        if (place.country) parts.push(place.country);

        const subtitle = parts.join(", ") || "Current GPS Location";
        const fullName =
          primaryName === subtitle
            ? primaryName
            : `${primaryName}${parts.length > 0 ? `, ${parts[0]}` : ""}`;

        return {
          id: `current-${Date.now()}`,
          name: fullName,
          subtitle,
          type: "Current Location",
          latitude,
          longitude,
        };
      }

      return {
        id: `coords-${Date.now()}`,
        name: `Lat: ${latitude.toFixed(3)}, Lon: ${longitude.toFixed(3)}`,
        subtitle: "GPS Location",
        type: "Current Location",
        latitude,
        longitude,
      };
    } catch (err) {
      console.warn("Failed to get current device location:", err);
      return null;
    }
  },

  // Search places in real-time using Photon OpenStreetMap API with optional lat/lon bias
  async searchLocations(
    query: string,
    currentCoords?: { latitude: number; longitude: number } | null
  ): Promise<RealLocationItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        trimmed
      )}&limit=12`;

      if (currentCoords) {
        url += `&lat=${currentCoords.latitude}&lon=${currentCoords.longitude}`;
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "CloneSocialApp/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Photon API returned ${response.status}`);
      }

      const data = await response.json();
      const features = data?.features || [];

      return features.map((f: any, idx: number) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [];
        const name = props.name || props.street || props.city || "Unknown Location";

        const subParts: string[] = [];
        if (props.district && props.district !== name) subParts.push(props.district);
        if (props.city && props.city !== name) subParts.push(props.city);
        if (props.state && props.state !== name && props.state !== props.city) {
          subParts.push(props.state);
        }
        if (props.country) subParts.push(props.country);

        const subtitle = subParts.join(", ") || props.country || "Location";
        const displayName =
          props.city && props.city !== name
            ? `${name}, ${props.city}`
            : props.country
            ? `${name}, ${props.country}`
            : name;

        return {
          id: `photon-${props.osm_id || idx}-${Date.now()}`,
          name: displayName,
          subtitle,
          type: props.type || "Place",
          latitude: coords[1],
          longitude: coords[0],
        };
      });
    } catch (err) {
      console.warn("Error searching real-time locations:", err);

      // Fallback to expo-location geocoding
      try {
        const geocoded = await Location.geocodeAsync(trimmed);
        if (geocoded && geocoded.length > 0) {
          const results: RealLocationItem[] = [];
          for (let i = 0; i < Math.min(geocoded.length, 5); i++) {
            const loc = geocoded[i];
            const rev = await Location.reverseGeocodeAsync({
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
            if (rev && rev[0]) {
              const p = rev[0];
              const name = p.name || p.city || trimmed;
              const sub = [p.city, p.region, p.country].filter(Boolean).join(", ");
              results.push({
                id: `geo-${i}-${Date.now()}`,
                name: sub ? `${name}, ${sub}` : name,
                subtitle: sub || "Location",
                type: "Place",
                latitude: loc.latitude,
                longitude: loc.longitude,
              });
            }
          }
          return results;
        }
      } catch (fallbackErr) {
        console.warn("Fallback geocoding error:", fallbackErr);
      }

      return [];
    }
  },

  async getPopularLocations(): Promise<RealLocationItem[]> {
    return [
      {
        id: "pop-1",
        name: "Central Park, New York",
        subtitle: "New York, United States",
        type: "Park",
        latitude: 40.785091,
        longitude: -73.968285,
      },
      {
        id: "pop-2",
        name: "Eiffel Tower, Paris",
        subtitle: "Paris, France",
        type: "Monument",
        latitude: 48.8584,
        longitude: 2.2945,
      },
      {
        id: "pop-3",
        name: "Times Square, New York",
        subtitle: "New York, United States",
        type: "Square",
        latitude: 40.758,
        longitude: -73.9855,
      },
      {
        id: "pop-4",
        name: "London Eye, London",
        subtitle: "London, United Kingdom",
        type: "Attraction",
        latitude: 51.5033,
        longitude: -0.1195,
      },
      {
        id: "pop-5",
        name: "Tokyo Tower, Tokyo",
        subtitle: "Tokyo, Japan",
        type: "Attraction",
        latitude: 35.6586,
        longitude: 139.7454,
      },
    ];
  },
};

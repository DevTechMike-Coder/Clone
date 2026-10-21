import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { locationService, RealLocationItem } from "@/services/locationService";
import {
  Button,
  EmptyState,
  IconButton,
  PressableScale,
  Text,
  TextField,
} from "@/components/ui";

type LocationPickerModalProps = {
  visible: boolean;
  selectedLocation: string | null;
  onClose: () => void;
  onSelectLocation: (location: string | null) => void;
};

export default function LocationPickerModal({
  visible,
  selectedLocation,
  onClose,
  onSelectLocation,
}: LocationPickerModalProps) {
  const { isDark, palette } = useTheme();
  const [search, setSearch] = useState("");
  const [currentLocation, setCurrentLocation] = useState<RealLocationItem | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [searchResults, setSearchResults] = useState<RealLocationItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const debounceTimer = useRef<any>(null);

  const handleFetchCurrentLocation = async () => {
    setLoadingCurrent(true);
    setPermissionDenied(false);
    try {
      const loc = await locationService.getCurrentLocation();
      if (loc) {
        setCurrentLocation(loc);
      } else {
        setPermissionDenied(true);
      }
    } catch {
      setPermissionDenied(true);
    } finally {
      setLoadingCurrent(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      (async () => {
        setSearch("");
        setSearchResults([]);
        handleFetchCurrentLocation();

        // Load nearby / popular places initially
        const nearby = await locationService.getPopularLocations();
        if (isMounted) {
          setSearchResults(nearby);
        }
      })();
    }

    return () => {
      isMounted = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [visible]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      locationService.getPopularLocations().then((res) => setSearchResults(res));
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await locationService.searchLocations(text);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handlePickLocation = (locName: string) => {
    Haptics.selectionAsync();
    onSelectLocation(locName);
    onClose();
  };

  const handleClearLocation = () => {
    Haptics.selectionAsync();
    onSelectLocation(null);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleWrapper}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: palette.borderSubtle },
              ]}
            />
          </View>

          {/* Header */}
          <View
            style={[
              styles.headerRow,
              { borderBottomColor: palette.borderSubtle },
            ]}
          >
            <IconButton
              icon={<Ionicons name="close" size={22} color={palette.muted} />}
              onPress={onClose}
              accessibilityLabel="Close"
              size="sm"
            />

            <Text variant="headline" weight="bold">
              Add Location
            </Text>

            {selectedLocation ? (
              <Button
                title="Remove"
                variant="danger"
                size="sm"
                onPress={handleClearLocation}
              />
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <TextField
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search city, neighborhood, or place..."
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={
                searching ? (
                  <ActivityIndicator size="small" color={palette.accent} />
                ) : (
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={palette.muted}
                  />
                )
              }
              rightIcon={
                search.length > 0 ? (
                  <TouchableOpacity onPress={() => handleSearchChange("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={palette.muted}
                    />
                  </TouchableOpacity>
                ) : undefined
              }
            />
          </View>

          {/* Current Real-Time GPS Location Row */}
          {!search && (
            <View style={styles.realtimeSection}>
              <Text
                variant="caption"
                weight="bold"
                color="muted"
                style={styles.realtimeHeader}
              >
                REAL-TIME LOCATION
              </Text>

              {loadingCurrent ? (
                <View
                  style={[
                    styles.currentLocationRow,
                    {
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={palette.accent} />
                  <Text variant="body" color="muted">
                    Detecting current GPS location...
                  </Text>
                </View>
              ) : currentLocation ? (
                <PressableScale
                  onPress={() => handlePickLocation(currentLocation.name)}
                  style={[
                    styles.currentLocationRow,
                    {
                      backgroundColor: isDark
                        ? colors.emerald[950] + "50"
                        : colors.emerald[50],
                      borderColor: isDark
                        ? colors.emerald[900] + "70"
                        : colors.emerald[200],
                    },
                  ]}
                >
                  <View style={styles.currentLocLeft}>
                    <View
                      style={[
                        styles.currentLocIconBox,
                        { backgroundColor: palette.success },
                      ]}
                    >
                      <Ionicons
                        name="navigate"
                        size={18}
                        color={colors.white}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text
                        variant="body"
                        weight="bold"
                        numberOfLines={1}
                        style={{
                          color: isDark
                            ? colors.emerald[200]
                            : colors.emerald[900],
                        }}
                      >
                        {currentLocation.name}
                      </Text>
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={{
                          color: isDark
                            ? colors.emerald[400]
                            : colors.emerald[700],
                        }}
                      >
                        {currentLocation.subtitle} • Current Device Location
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor: isDark
                          ? colors.emerald[900] + "60"
                          : colors.emerald[600] + "20",
                      },
                    ]}
                  >
                    <Text
                      variant="micro"
                      weight="bold"
                      style={{
                        color: isDark
                          ? colors.emerald[300]
                          : colors.emerald[800],
                      }}
                    >
                      LIVE
                    </Text>
                  </View>
                </PressableScale>
              ) : permissionDenied ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleFetchCurrentLocation}
                  style={[
                    styles.currentLocationRow,
                    {
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.currentLocLeft}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={palette.muted}
                    />
                    <View style={styles.flex1}>
                      <Text variant="body" weight="semibold">
                        Enable location permission
                      </Text>
                      <Text variant="caption" color="muted">
                        Tap to allow access to local real-time places
                      </Text>
                    </View>
                  </View>
                  <Text variant="caption" weight="bold" color="accent">
                    Allow
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Custom Typed Location Option */}
          {search.trim().length > 0 && (
            <PressableScale
              onPress={() => handlePickLocation(search.trim())}
              style={[
                styles.customLocationRow,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.customAddIcon,
                  { backgroundColor: palette.accent },
                ]}
              >
                <Ionicons name="add" size={18} color={palette.onAccent} />
              </View>
              <View style={styles.flex1}>
                <Text variant="body" weight="bold">
                  {`Use "${search.trim()}"`}
                </Text>
                <Text variant="caption" color="muted">
                  Tag custom location
                </Text>
              </View>
            </PressableScale>
          )}

          {/* Search Results / Live Places List */}
          {search.trim().length > 0 &&
          searchResults.length === 0 &&
          !searching ? (
            <EmptyState
              icon={
                <Ionicons
                  name="location-outline"
                  size={40}
                  color={palette.muted}
                />
              }
              title={`No places found for "${search.trim()}"`}
              description='You can still tap "Use" above to tag this custom name.'
            />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = selectedLocation === item.name;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handlePickLocation(item.name)}
                    style={[
                      styles.locationItemRow,
                      { borderBottomColor: palette.borderSubtle },
                    ]}
                  >
                    <View style={styles.locationItemLeft}>
                      <View
                        style={[
                          styles.locationIconTile,
                          {
                            backgroundColor: palette.surfaceElevated,
                            borderColor: palette.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="location-sharp"
                          size={18}
                          color={palette.muted}
                        />
                      </View>

                      <View style={styles.flex1}>
                        <Text variant="body" weight="bold" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text
                          variant="caption"
                          color="muted"
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={palette.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  handleWrapper: {
    alignItems: "center",
    marginBottom: 8,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerSpacer: {
    width: 32,
  },
  searchSection: {
    paddingVertical: 12,
  },
  realtimeSection: {
    marginBottom: 12,
  },
  realtimeHeader: {
    marginBottom: 8,
    paddingHorizontal: 2,
    letterSpacing: 0.5,
  },
  currentLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  currentLocLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  currentLocIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  customLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  customAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 16,
  },
  locationItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  locationItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  locationIconTile: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  flex1: {
    flex: 1,
  },
});

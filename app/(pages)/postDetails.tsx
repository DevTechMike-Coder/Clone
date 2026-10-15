import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { postService } from "@/services/postService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getPendingPostData,
  clearPendingPostData,
} from "@/store/pendingPost";
import { CAMERA_FILTERS } from "@/components/camera/FilterPicker";
import { ProfileSearchResult } from "@/services/profileService";
import TagPeopleModal from "@/components/modal/TagPeopleModal";
import LocationPickerModal from "@/components/modal/LocationPickerModal";
import Toast from "react-native-toast-message";
import { Screen, ScreenHeader, Text, Button, ListSection, ListRow } from "@/components/ui";

export default function PostDetails() {
  const postData = getPendingPostData();
  const mediaUri = postData?.mediaUri ?? "";
  const mediaType = postData?.mediaType ?? "image";
  const filterId = postData?.filterId;
  const musicTrack = postData?.musicTrack;

  const { palette } = useTheme();
  const { session } = useAuth();

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<ProfileSearchResult[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  useEffect(() => {
    return () => clearPendingPostData();
  }, []);

  const handlePost = async () => {
    if (!session?.user) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "You must be logged in to post.",
      });
      return;
    }

    if (!mediaUri) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No media file selected.",
      });
      return;
    }

    setLoading(true);
    try {
      const activeFilter = CAMERA_FILTERS.find((f) => f.id === filterId);

      await postService.createPost({
        user_id: session.user.id,
        media_url: mediaUri,
        media_type: mediaType,
        caption: caption.trim() || undefined,
        filter_id: filterId,
        music_track_id: musicTrack?.id,
        music_track_title: musicTrack?.title,
        music_track_artist: musicTrack?.artist,
        music_track_audio_url: musicTrack?.audioUrl ?? undefined,
        music_track_attribution: musicTrack?.attribution ?? undefined,
        has_sound: Boolean(musicTrack?.audioUrl),
      });

      Toast.show({
        type: "success",
        text1: "Posted!",
        text2: "Your post is now live on your feed.",
      });

      clearPendingPostData();
      router.replace("/home");
    } catch (error: any) {
      console.error("Error creating post:", error);
      Toast.show({
        type: "error",
        text1: "Post Failed",
        text2: error.message || "Failed to create post.",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTaggedUser = (userId: string) => {
    setTaggedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const activeFilterObj = CAMERA_FILTERS.find((f) => f.id === filterId);

  return (
    <Screen edges={["top", "bottom"]} keyboardAvoiding>
      <ScreenHeader
        title="New Post"
        rightAction={
          <Button
            title="Share"
            size="sm"
            variant="primary"
            loading={loading}
            onPress={handlePost}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media Thumbnail & Caption Box */}
        <View
          style={[
            styles.captionCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.thumbnailWrapper}>
            {mediaUri ? (
              <>
                <Image
                  source={{ uri: mediaUri }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={150}
                />
                {activeFilterObj?.overlayColor && (
                  <View
                    style={[
                      styles.filterOverlay,
                      { backgroundColor: activeFilterObj.overlayColor },
                    ]}
                  />
                )}
                {mediaType === "video" && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={12} color="#FFFFFF" />
                  </View>
                )}
              </>
            ) : (
              <Ionicons name="image-outline" size={32} color={palette.muted} />
            )}
          </View>

          <TextInput
            placeholder="Write an engaging caption..."
            placeholderTextColor={palette.placeholder}
            multiline
            numberOfLines={4}
            value={caption}
            onChangeText={setCaption}
            style={[
              styles.captionInput,
              {
                color: palette.text,
                fontFamily: "PlusJakartaSans_400Regular",
              },
            ]}
            textAlignVertical="top"
          />
        </View>

        {/* Attached Sound Tag Pill */}
        {musicTrack && (
          <View
            style={[
              styles.soundCard,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          >
            {musicTrack.coverUrl ? (
              <Image
                source={{ uri: musicTrack.coverUrl }}
                style={styles.soundCover}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.soundCoverPlaceholder,
                  { backgroundColor: palette.accent },
                ]}
              >
                <Ionicons name="musical-notes" size={18} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.flex1}>
              <Text variant="body" weight="semibold" numberOfLines={1}>
                {musicTrack.title}
              </Text>
              <Text variant="caption" color="muted">
                {musicTrack.artist}
                {musicTrack.durationSeconds
                  ? ` • ${Math.floor(musicTrack.durationSeconds / 60)}:${String(
                      Math.floor(musicTrack.durationSeconds % 60)
                    ).padStart(2, "0")}`
                  : ""}
              </Text>
            </View>
          </View>
        )}

        {/* Selected Location Pill */}
        {selectedLocation && (
          <View
            style={[
              styles.locationCard,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.locationContent}>
              <View
                style={[
                  styles.locationIconTile,
                  { backgroundColor: palette.success + "20" },
                ]}
              >
                <Ionicons name="location" size={16} color={palette.success} />
              </View>
              <View style={styles.flex1}>
                <Text variant="caption" weight="bold" numberOfLines={1}>
                  {selectedLocation}
                </Text>
                <Text variant="micro" color="muted">
                  Location Tagged
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedLocation(null)}
              accessibilityRole="button"
              accessibilityLabel="Remove location"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Tagged People Chips */}
        {taggedUsers.length > 0 && (
          <View
            style={[
              styles.taggedCard,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.taggedHeader}>
              <View style={styles.row}>
                <Ionicons name="people" size={16} color={palette.accent} />
                <Text variant="caption" weight="bold" style={{ marginLeft: 6 }}>
                  Tagged People ({taggedUsers.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTagModal(true)}>
                <Text variant="caption" color="accent" weight="semibold">
                  + Edit
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {taggedUsers.map((user) => (
                <View
                  key={user.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.borderSubtle,
                    },
                  ]}
                >
                  {user.avatar_url ? (
                    <Image
                      source={{ uri: user.avatar_url }}
                      style={styles.chipAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons name="person-circle" size={16} color={palette.accent} />
                  )}
                  <Text variant="micro" weight="semibold">
                    @{user.username || "user"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeTaggedUser(user.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove tag ${user.username || "user"}`}
                  >
                    <Ionicons name="close-circle" size={14} color={palette.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Location & Tag Section Rows */}
        <View style={styles.settingsSection}>
          <ListSection>
            <ListRow
              icon={
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={selectedLocation ? palette.success : palette.muted}
                />
              }
              title={selectedLocation ? "Change Location" : "Add Location"}
              subtitle={selectedLocation || "Show where this was captured"}
              onPress={() => setShowLocationModal(true)}
            />
            <ListRow
              icon={
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={taggedUsers.length > 0 ? palette.accent : palette.muted}
                />
              }
              title={
                taggedUsers.length > 0
                  ? `Tagged People (${taggedUsers.length})`
                  : "Tag People"
              }
              subtitle={
                taggedUsers.length > 0
                  ? taggedUsers.map((u) => `@${u.username}`).join(", ")
                  : "Tag friends in your post"
              }
              onPress={() => setShowTagModal(true)}
            />
          </ListSection>
        </View>
      </ScrollView>

      {/* Tag People Modal */}
      <TagPeopleModal
        visible={showTagModal}
        selectedUsers={taggedUsers}
        onClose={() => setShowTagModal(false)}
        onSave={setTaggedUsers}
      />

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationModal}
        selectedLocation={selectedLocation}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={setSelectedLocation}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  captionCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  thumbnailWrapper: {
    width: 100,
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  filterOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  captionInput: {
    flex: 1,
    height: 130,
    fontSize: 15,
    paddingTop: 4,
  },
  soundCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  soundCover: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  soundCoverPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  locationIconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  taggedCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  taggedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  settingsSection: {
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },
});
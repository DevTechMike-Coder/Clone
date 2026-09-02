import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { postService } from "@/services/postService";
import { useAuth } from "@/context/AuthContext";
import {
  getPendingPostData,
  clearPendingPostData,
} from "@/store/pendingPost";
import { CAMERA_FILTERS } from "@/components/camera/FilterPicker";
import { ProfileSearchResult } from "@/services/profileService";
import TagPeopleModal from "@/components/modal/TagPeopleModal";
import LocationPickerModal from "@/components/modal/LocationPickerModal";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

const PostDetails = () => {
  const postData = getPendingPostData();
  const mediaUri = postData?.mediaUri ?? "";
  const mediaType = postData?.mediaType ?? "image";
  const filterId = postData?.filterId;
  const musicTrack = postData?.musicTrack;

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<ProfileSearchResult[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  const { session } = useAuth();

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
        text2: "No media selected.",
      });
      return;
    }

    setLoading(true);
    try {
      const publicUrl = await postService.uploadMedia(
        mediaUri,
        session.user.id,
        mediaType,
      );

      // Assemble final rich caption with tags, location and music
      let finalCaption = caption.trim();

      if (taggedUsers.length > 0) {
        const tagString = taggedUsers.map((u) => `@${u.username || "user"}`).join(" ");
        finalCaption = finalCaption ? `${finalCaption}\n\n👥 ${tagString}` : `👥 ${tagString}`;
      }

      if (selectedLocation) {
        finalCaption = finalCaption
          ? `${finalCaption}\n📍 ${selectedLocation}`
          : `📍 ${selectedLocation}`;
      }

      if (musicTrack) {
        finalCaption = finalCaption
          ? `${finalCaption}\n🎵 ${musicTrack.title} - ${musicTrack.artist}`
          : `🎵 ${musicTrack.title} - ${musicTrack.artist}`;
      }

      await postService.createPost({
        user_id: session.user.id,
        media_url: publicUrl,
        media_type: mediaType,
        caption: finalCaption,
        filter_id: filterId,
        music_track_id: musicTrack?.id,
        music_track_title: musicTrack?.title,
        music_track_artist: musicTrack?.artist,
        music_track_cover_url: musicTrack?.coverUrl,
        music_track_audio_url: musicTrack?.audioUrl,
        music_track_attribution: musicTrack?.attribution,
        duration_seconds: musicTrack?.durationSeconds,
        has_sound: Boolean(musicTrack),
      });

      Toast.show({
        type: "success",
        text1: "Published!",
        text2: "Your post is now live.",
      });

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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="p-1"
          >
            <Ionicons name="chevron-back" size={26} color={colors.slate[900]} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">New Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={loading}
            className="bg-blue-600 px-5 py-2 rounded-full active:opacity-80"
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-sm">Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          {/* Media Thumbnail & Caption Box */}
          <View className="flex-row gap-4">
            <View className="w-28 h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-sm">
              {mediaUri ? (
                <>
                  <Image
                    source={{ uri: mediaUri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                  {activeFilterObj?.overlayColor && (
                    <View
                      className="absolute inset-0"
                      style={{ backgroundColor: activeFilterObj.overlayColor }}
                    />
                  )}
                  {mediaType === "video" && (
                    <View className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded-md">
                      <Ionicons name="videocam" size={12} color="white" />
                    </View>
                  )}
                </>
              ) : (
                <Ionicons name="image-outline" size={32} color={colors.slate[400]} />
              )}
            </View>
            <View className="flex-1">
              <TextInput
                placeholder="Write an engaging caption..."
                placeholderTextColor={colors.slate[400]}
                multiline
                numberOfLines={4}
                value={caption}
                onChangeText={setCaption}
                className="text-base text-slate-900 dark:text-slate-50 pt-2 h-36"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Attached Sound Tag Pill */}
          {musicTrack && (
            <View className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-2xl flex-row items-center gap-3 shadow-sm">
              {musicTrack.coverUrl ? (
                <Image
                  source={{ uri: musicTrack.coverUrl }}
                  className="w-10 h-10 rounded-xl"
                  contentFit="cover"
                />
              ) : (
                <View className="w-10 h-10 rounded-xl bg-blue-600 items-center justify-center">
                  <Ionicons name="musical-notes" size={18} color="white" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-tight" numberOfLines={1}>
                  {musicTrack.title}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {musicTrack.artist}
                  {musicTrack.durationSeconds
                    ? ` • ${Math.floor(musicTrack.durationSeconds / 60)}:${String(
                        Math.floor(musicTrack.durationSeconds % 60),
                      ).padStart(2, "0")}`
                    : ""}
                </Text>
                {musicTrack.attribution ? (
                  <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                    {musicTrack.attribution}
                  </Text>
                ) : null}
              </View>
              {musicTrack.audioUrl ? (
                <View className="px-2 py-1 rounded-full bg-blue-100 border border-blue-200">
                  <Text className="text-[10px] font-bold uppercase text-blue-700">
                    {musicTrack.license ? musicTrack.license : "Sound"}
                  </Text>
                </View>
              ) : (
                <View className="px-2 py-1 rounded-full bg-amber-100 border border-amber-200">
                  <Text className="text-[10px] font-bold uppercase text-amber-700">
                    No audio
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Selected Location Pill */}
          {selectedLocation && (
            <View className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 rounded-2xl flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                <View className="w-8 h-8 rounded-xl bg-emerald-600 items-center justify-center">
                  <Ionicons name="location" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-emerald-900" numberOfLines={1}>
                    {selectedLocation}
                  </Text>
                  <Text className="text-[10px] text-emerald-600">Location Tagged</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedLocation(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove location"
                className="p-1"
              >
                <Ionicons name="close-circle" size={20} color={colors.emerald[500]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Selected Tagged People Chips */}
          {taggedUsers.length > 0 && (
            <View className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-2xl">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="people" size={16} color={colors.violet[600]} />
                  <Text className="text-xs font-bold text-purple-900">
                    Tagged People ({taggedUsers.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowTagModal(true)}>
                  <Text className="text-xs font-bold text-purple-600">+ Edit</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {taggedUsers.map((user) => (
                  <View
                    key={user.id}
                    className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-purple-200 px-3 py-1.5 rounded-full shadow-sm"
                  >
                    {user.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        className="w-5 h-5 rounded-full"
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="person-circle" size={18} color={colors.violet[600]} />
                    )}
                    <Text className="text-xs font-bold text-purple-800">
                      @{user.username || "user"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeTaggedUser(user.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove tag ${user.username || "user"}`}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.purple[600]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Interactive Actions (Add Location, Tag People) */}
          <View className="mt-6 gap-3.5 pb-12">
            {/* Add Location Row */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowLocationModal(true)}
              className="flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <Ionicons
                    name="location-outline"
                    size={22}
                    color={selectedLocation ? colors.emerald[500] : colors.slate[600]}
                  />
                </View>
                <View>
                  <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {selectedLocation ? "Change Location" : "Add Location"}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {selectedLocation || "Show where this was captured"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
            </TouchableOpacity>

            {/* Tag People Row */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowTagModal(true)}
              className="flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color={taggedUsers.length > 0 ? colors.violet[600] : colors.slate[600]}
                  />
                </View>
                <View>
                  <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {taggedUsers.length > 0
                      ? `Tagged People (${taggedUsers.length})`
                      : "Tag People"}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {taggedUsers.length > 0
                      ? taggedUsers.map((u) => `@${u.username}`).join(", ")
                      : "Tag friends in your post"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetails;
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
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { postService } from "@/services/postService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  getPendingPostData,
  clearPendingPostData,
} from "@/store/pendingPost";
import { CAMERA_FILTERS } from "@/components/camera/FilterPicker";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

const PostDetails = () => {
  const postData = getPendingPostData();
  const mediaUri = postData?.mediaUri ?? "";
  const mediaType = postData?.mediaType ?? "image";
  const filterId = postData?.filterId;
  const musicTrack = postData?.musicTrack;

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
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
      // --- TEMPORARY DEBUG: compare what Postgres sees as auth.uid()
      // against what the app thinks session.user.id is. Remove once the
      // RLS insert issue is confirmed fixed.
      const { data: whoami, error: whoamiErr } = await supabase.rpc(
        "debug_whoami",
      );
      console.log("[debug] Postgres sees auth.uid() as:", whoami, whoamiErr);
      console.log("[debug] App thinks session.user.id is:", session.user.id);
      // --- END TEMPORARY DEBUG

      const publicUrl = await postService.uploadMedia(
        mediaUri,
        session.user.id,
        mediaType,
      );

      // Append music sound tag to caption if attached
      let finalCaption = caption.trim();
      if (musicTrack) {
        finalCaption = finalCaption
          ? `${finalCaption}\n\n🎵 ${musicTrack.title} - ${musicTrack.artist}`
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

  const activeFilterObj = CAMERA_FILTERS.find((f) => f.id === filterId);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">New Post</Text>
          <TouchableOpacity onPress={handlePost} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text className="text-blue-600 font-bold text-lg">Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-6">
          <View className="flex-row gap-4">
            <View className="w-28 h-36 rounded-2xl bg-slate-100 items-center justify-center overflow-hidden border border-slate-200 relative">
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
                    <View className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded">
                      <Ionicons name="videocam" size={12} color="white" />
                    </View>
                  )}
                </>
              ) : (
                <Ionicons name="image-outline" size={32} color="#94A3B8" />
              )}
            </View>
            <View className="flex-1">
              <TextInput
                placeholder="Write a caption..."
                multiline
                numberOfLines={4}
                value={caption}
                onChangeText={setCaption}
                className="text-base text-slate-900 pt-2 h-36"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Attached Sound Tag Pill */}
          {musicTrack && (
            <View className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-blue-600 items-center justify-center">
                <Ionicons name="musical-notes" size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900 leading-tight">
                  {musicTrack.title}
                </Text>
                <Text className="text-xs text-slate-500">
                  {musicTrack.artist}
                </Text>
              </View>
            </View>
          )}

          <View className="mt-8 gap-4">
            <TouchableOpacity className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
              <View className="flex-row items-center gap-3">
                <Ionicons name="location-outline" size={22} color="#475569" />
                <Text className="text-base text-slate-700">Add Location</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
              <View className="flex-row items-center gap-3">
                <Ionicons name="person-outline" size={22} color="#475569" />
                <Text className="text-base text-slate-700">Tag People</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetails;
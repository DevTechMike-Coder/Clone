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
import { useAuth } from "@/context/AuthContext";
import { getPendingImageUri, clearPendingImageUri } from "@/store/pendingPost";

const SafeAreaView = styled(RNSafeAreaView);

const PostDetails = () => {
  const imageUri = getPendingImageUri() ?? "";

  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    return () => clearPendingImageUri();
  }, []);

  const handlePost = async () => {
    if (!session?.user) {
      Alert.alert("Error", "You must be logged in to post.");
      return;
    }

    if (!imageUri) {
      Alert.alert("Error", "No image selected.");
      return;
    }

    setLoading(true);
    try {
      const publicUrl = await postService.uploadMedia(imageUri, session.user.id);

      await postService.createPost({
        user_id: session.user.id,
        media_url: publicUrl,
        media_type: "image",
        caption: caption,
      });

      router.replace("/home");
    } catch (error: any) {
      console.error("Error creating post:", error);
      Alert.alert("Error", error.message || "Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

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
            <View className="w-24 h-32 rounded-xl bg-slate-100 items-center justify-center overflow-hidden">
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
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
                className="text-base text-slate-900 pt-2 h-32"
                textAlignVertical="top"
              />
            </View>
          </View>

          <View className="mt-10 gap-6">
            <TouchableOpacity className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center gap-3">
                <Ionicons name="location-outline" size={24} color="#475569" />
                <Text className="text-base text-slate-700">Add Location</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center gap-3">
                <Ionicons name="person-outline" size={24} color="#475569" />
                <Text className="text-base text-slate-700">Tag People</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetails;
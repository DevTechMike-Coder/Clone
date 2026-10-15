import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import { profileService } from "@/services/profileService";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

const EditProfile = () => {
  const { user } = useAuth();
  const { palette } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const profile = await profileService.getProfile(user.id);
        if (profile) {
          setFullName(profile.full_name || "");
          setUsername(profile.username || "");
          setBio(profile.bio || "");
          if (profile.website) {
            setUrl(profile.website);
          }
          if (profile.avatar_url) {
            setImage(profile.avatar_url);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const validateUrl = (text: string) => {
    const trimmed = text.trim();
    setUrl(text);
    if (!trimmed) {
      setIsValid(true);
      return;
    }
    const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    setIsValid(urlRegex.test(trimmed));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmedUrl = url.trim();
    if (!isValid && trimmedUrl !== "") {
      Toast.show({
        type: "error",
        text1: "Invalid URL",
        text2: "Please provide a valid website URL (e.g. example.com).",
      });
      return;
    }

    let formattedUrl = trimmedUrl;
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setSaving(true);
    try {
      let avatarUrl = image;
      if (image && !image.startsWith("http")) {
        avatarUrl = await profileService.uploadAvatar(image, user.id);
      }

      const updates = {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        website: formattedUrl || null,
        avatar_url: avatarUrl,
      };

      await profileService.updateProfile(user.id, updates);

      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Your changes have been saved.",
      });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.message || "Could not save profile changes.",
      });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Edit Profile"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === "android" ? 140 : 80}
        >
          {/* Avatar Photo Picker */}
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={{ position: "relative" }}
            >
              <Avatar
                url={image}
                name={fullName || username}
                size={110}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: palette.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: palette.background,
                }}
              >
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} style={{ marginTop: 10 }}>
              <Text variant="caption" weight="bold" color="accent">
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={{ gap: 16 }}>
            <TextField
              label="Full Name"
              placeholder="e.g. Alex Johnson"
              value={fullName}
              onChangeText={setFullName}
            />

            <TextField
              label="Username"
              placeholder="username"
              leftIcon={
                <Text variant="body" weight="semibold" color="muted">
                  @
                </Text>
              }
              value={username}
              onChangeText={(val) => setUsername(val.replace(/\s+/g, ""))}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextField
              label={`Bio (${bio.length}/150)`}
              placeholder="Tell us a little about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
              numberOfLines={3}
              inputStyle={{ minHeight: 80, textAlignVertical: "top" }}
            />

            <TextField
              label="Website / Link"
              placeholder="yoursite.com or https://..."
              leftIcon={
                <Ionicons name="link-outline" size={18} color={palette.muted} />
              }
              value={url}
              onChangeText={validateUrl}
              errorText={!isValid ? "Please enter a valid website address" : undefined}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 32,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => router.back()}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                title="Save Changes"
                variant="primary"
                loading={saving}
                onPress={handleSave}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      )}
    </Screen>
  );
};

export default EditProfile;

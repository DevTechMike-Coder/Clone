import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "@/components/StyledLinearGradient";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profileService";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";
import { usePalette } from "@/context/ThemeContext";

const SafeAreaView = styled(RNSafeAreaView);

const ACCENT = colors.blue[600];

const EditProfile = () => {
  const { user } = useAuth();
  // Scheme-aware semantic tokens (dark mode support) — these used to be
  // module-level light-only constants.
  const palette = usePalette();
  const BG = palette.background;
  const SURFACE = palette.surface;
  const BORDER = palette.border;
  const TEXT_PRIMARY = palette.text;
  const TEXT_MUTED = palette.muted;
  const PLACEHOLDER = palette.placeholder;
  const [image, setImage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    // Flexible regex allowing domains with or without protocol
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

    // Auto-normalize website URL if missing protocol
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

  const getBorderColor = (field: string, isError = false) => {
    if (isError) return colors.red[500];
    return focusedField === field ? ACCENT : BORDER;
  };

  const inputStyle = (field: string, extraPaddingLeft = 18, isError = false) => ({
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: getBorderColor(field, isError),
    backgroundColor: SURFACE,
    paddingHorizontal: 18,
    paddingLeft: extraPaddingLeft,
    fontSize: 15,
    color: TEXT_PRIMARY,
  });

  const labelStyle = {
    fontSize: 11,
    fontWeight: "700" as const,
    color: TEXT_MUTED,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 8,
    marginLeft: 2,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            height: 42,
            width: 42,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 21,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: TEXT_PRIMARY,
            letterSpacing: -0.5,
          }}
        >
          Edit Profile
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            height: 42,
            width: 42,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 21,
          }}
        >
          <Ionicons name="settings-outline" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "android" ? 140 : 80}
        extraHeight={Platform.OS === "android" ? 140 : 80}
        keyboardOpeningTime={Platform.OS === "android" ? 250 : 0}
        enableResetScrollToCoords={false}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {/* Avatar */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <LinearGradient
                colors={[colors.blue[100], colors.blue[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 136,
                  height: 136,
                  borderRadius: 68,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 3,
                }}
              >
                <View
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                    backgroundColor: colors.slate[50],
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Ionicons name="person" size={50} color={colors.slate[300]} />
                  )}
                </View>
              </LinearGradient>

              {/* Camera badge */}
              <LinearGradient
                colors={[colors.blue[600], colors.blue[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2.5,
                  borderColor: BG,
                }}
              >
                <Ionicons name="camera" size={15} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: "600",
                color: ACCENT,
                letterSpacing: 0.3,
              }}
            >
              Change Photo
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{ height: 1, backgroundColor: BORDER, marginBottom: 24 }}
          />

          {/* Form */}
          <View>
            {/* Full Name */}
            <View style={{ marginBottom: 18 }}>
              <Text style={labelStyle}>Full Name</Text>
              <TextInput
                placeholder="Joe Linton"
                placeholderTextColor={PLACEHOLDER}
                style={inputStyle("fullname")}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedField("fullname")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Username */}
            <View style={{ marginBottom: 18 }}>
              <Text style={labelStyle}>Username</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  placeholder="username"
                  placeholderTextColor={PLACEHOLDER}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={inputStyle("username", 42, false)}
                  value={username}
                  onChangeText={(val) => setUsername(val.replace(/\s+/g, ""))}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 0,
                    height: 52,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color:
                        focusedField === "username" ? ACCENT : TEXT_MUTED,
                    }}
                  >
                    @
                  </Text>
                </View>
                {username.length > 0 && focusedField === "username" && (
                  <TouchableOpacity
                    onPress={() => setUsername("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear username"
                    style={{
                      position: "absolute",
                      right: 14,
                      top: 0,
                      height: 52,
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Bio */}
            <View style={{ marginBottom: 18 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={labelStyle}>Bio</Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: bio.length > 140 ? colors.red[500] : TEXT_MUTED,
                    marginBottom: 8,
                    marginRight: 2,
                  }}
                >
                  {bio.length}/150
                </Text>
              </View>
              <TextInput
                placeholder="Tell us a little about yourself..."
                placeholderTextColor={PLACEHOLDER}
                multiline
                maxLength={150}
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  minHeight: 96,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: getBorderColor("bio"),
                  backgroundColor: SURFACE,
                  padding: 14,
                  fontSize: 15,
                  color: TEXT_PRIMARY,
                }}
                value={bio}
                onChangeText={setBio}
                onFocus={() => setFocusedField("bio")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Website */}
            <View style={{ marginBottom: 24 }}>
              <Text style={labelStyle}>Website / Link</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  placeholder="example.com or https://..."
                  placeholderTextColor={PLACEHOLDER}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={url}
                  onChangeText={validateUrl}
                  style={inputStyle("link", 46, !isValid)}
                  onFocus={() => setFocusedField("link")}
                  onBlur={() => setFocusedField(null)}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 0,
                    height: 52,
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="link-outline"
                    size={18}
                    color={
                      !isValid
                        ? colors.red[500]
                        : focusedField === "link"
                        ? ACCENT
                        : TEXT_MUTED
                    }
                  />
                </View>
                {url.length > 0 && focusedField === "link" && (
                  <TouchableOpacity
                    onPress={() => validateUrl("")}
                    style={{
                      position: "absolute",
                      right: 14,
                      top: 0,
                      height: 52,
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
                  </TouchableOpacity>
                )}
              </View>
              {!isValid && (
                <Text
                  style={{
                    marginTop: 6,
                    marginLeft: 4,
                    fontSize: 12,
                    fontWeight: "500",
                    color: colors.red[500],
                  }}
                >
                  Please enter a valid website address (e.g. yoursite.com)
                </Text>
              )}
            </View>
          </View>

          {/* Divider */}
          <View
            style={{ height: 1, backgroundColor: BORDER, marginBottom: 24 }}
          />

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              style={{
                height: 52,
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                backgroundColor: colors.slate[200],
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: colors.slate[500] }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.85} 
              style={{ flex: 2 }}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={saving ? [colors.slate[400], colors.slate[500]] : [colors.blue[600], colors.blue[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 52,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : null}
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.white,
                    letterSpacing: 0.3,
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default EditProfile;

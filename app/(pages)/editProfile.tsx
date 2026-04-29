import { View, Text, TouchableOpacity, Image, TextInput } from "react-native";
import React, { useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const SafeAreaView = styled(RNSafeAreaView);

const EditProfile = () => {
  const [image, setImage] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(true);

  const validateUrl = (text: string) => {
    const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
    setUrl(text);
    setIsValid(urlRegex.test(text) || text === "");
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-row items-center px-4 py-3 gap-4">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Image
            source={require("@/assets/homeIcons/chevronleft.png")}
            className="w-8 h-8"
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-500">
          Edit Profile
        </Text>
      </View>

      <View className="px-5 py-4">
        <View className="items-center mb-5">
          <View className="relative">
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              {image ? (
                <Image
                  source={{ uri: image }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center border-2 border-dashed border-gray-300">
                  <Image
                    source={require("@/assets/homeIcons/profileUser.png")}
                    className="w-14 h-14"
                    resizeMode="contain"
                  />
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full items-center justify-center border-2 border-white">
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View className="w-full gap-4">
          <View className="w-full">
            <Text className="text-gray-700 font-semibold text-lg">
              Full Name
            </Text>
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              className="h-12 rounded-2xl border border-gray-300 bg-white pl-4 pr-12 text-gray-900"
            />
          </View>

          <View className="w-full">
            <Text className="text-gray-700 font-semibold text-lg">
              Username
            </Text>
            <TextInput
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              className="h-12 rounded-2xl border border-gray-300 bg-white pl-4 pr-12 text-gray-900"
            />
          </View>

          <View className="relative w-full">
            <Text className="text-gray-700 font-semibold text-lg">Bio</Text>
            <TextInput
              placeholder="Bio"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="rounded-2xl border border-gray-300 bg-white p-4 text-gray-900"
            />
          </View>

          <View className="relative w-full">
            <Text className="text-gray-700 font-semibold text-lg">Links</Text>
            <TextInput
              placeholder="Link 1"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              value={url}
              onChangeText={validateUrl}
              className={`rounded-2xl border p-4 text-gray-900 ${
                isValid
                  ? "border-gray-300 bg-white"
                  : "border-red-400 bg-red-50"
              }`}
            />
            {!isValid && (
              <Text className="text-red-500 text-sm mt-1">
                Please enter a valid URL
              </Text>
            )}
          </View>

          <View className="mt-6 gap-2 flex flex-row justify-between">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.back()}
              className="h-12 w-[49%] items-center justify-center rounded-2xl bg-gray-100"
            >
              <Text className="text-base font-semibold text-gray-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              className="h-12 w-[49%] items-center justify-center rounded-2xl bg-blue-600"
            >
              <Text className="text-base font-semibold text-white">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EditProfile;

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextOverlayItem } from "@/store/pendingPost";

const COLOR_PALETTE = [
  "#FFFFFF",
  "#000000",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

type TextOverlayModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddText: (overlay: TextOverlayItem) => void;
};

export default function TextOverlayModal({
  visible,
  onClose,
  onAddText,
}: TextOverlayModalProps) {
  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#FFFFFF");
  const [hasBackground, setHasBackground] = useState(true);

  const handleDone = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onClose();
      return;
    }

    onAddText({
      id: Date.now().toString(),
      text: trimmed,
      color: hasBackground
        ? selectedColor === "#FFFFFF"
          ? "#000000"
          : "#FFFFFF"
        : selectedColor,
      bgColor: hasBackground
        ? selectedColor === "#FFFFFF"
          ? "#FFFFFF"
          : selectedColor
        : undefined,
    });

    setText("");
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/85 justify-between p-6"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pt-10">
          <TouchableOpacity
            onPress={() => {
              setText("");
              onClose();
            }}
            className="p-2"
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {/* Toggle background style */}
          <TouchableOpacity
            onPress={() => setHasBackground((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full border ${
              hasBackground
                ? "bg-white border-white"
                : "bg-transparent border-white/40"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                hasBackground ? "text-black" : "text-white"
              }`}
            >
              {hasBackground ? "Highlight" : "Classic"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            className="bg-blue-600 px-5 py-2 rounded-full"
          >
            <Text className="text-white font-bold text-sm">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Text Input Center Preview */}
        <View className="items-center justify-center py-10">
          <View
            className="px-4 py-2 rounded-2xl max-w-[85%]"
            style={{
              backgroundColor: hasBackground
                ? selectedColor === "#FFFFFF"
                  ? "#FFFFFF"
                  : selectedColor
                : "transparent",
            }}
          >
            <TextInput
              placeholder="Type your text..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              style={{
                fontSize: 24,
                fontWeight: "bold",
                textAlign: "center",
                color: hasBackground
                  ? selectedColor === "#FFFFFF"
                    ? "#000000"
                    : "#FFFFFF"
                  : selectedColor,
              }}
            />
          </View>
        </View>

        {/* Color Palette */}
        <View className="pb-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 12,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 10,
            }}
          >
            {COLOR_PALETTE.map((color) => {
              const active = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  className={`w-9 h-9 rounded-full items-center justify-center ${
                    active ? "border-2 border-white" : "border border-white/20"
                  }`}
                  style={{
                    backgroundColor: color,
                    transform: [{ scale: active ? 1.15 : 1 }],
                  }}
                >
                  {active && (
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: color === "#FFFFFF" ? "#000000" : "#FFFFFF",
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

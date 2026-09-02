import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  TextAlignMode,
  TextBgMode,
  TextOverlayItem,
  TextStyleMode,
} from "@/store/pendingPost";
import { colors } from "@/constants/theme";

const COLOR_PALETTE = [
  colors.white,
  colors.black,
  colors.red[500],
  colors.orange[500],
  colors.yellow[400],
  colors.emerald[500],
  colors.cyan[500],
  colors.blue[500],
  colors.violet[500],
  colors.pink[500],
  colors.rose[500],
];

const FONT_STYLES: { id: TextStyleMode; label: string }[] = [
  { id: "bold", label: "Bold" },
  { id: "classic", label: "Classic" },
  { id: "neon", label: "Neon" },
  { id: "typewriter", label: "Typewriter" },
  { id: "italic", label: "Italic" },
];

const BG_MODES: { id: TextBgMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: "solid", icon: "square", label: "Filled" },
  { id: "frosted", icon: "contrast", label: "Glass" },
  { id: "outline", icon: "square-outline", label: "Outline" },
  { id: "transparent", icon: "text", label: "Plain" },
];

const FONT_SIZES = [
  { label: "S", size: 22 },
  { label: "M", size: 28 },
  { label: "L", size: 36 },
];

type TextOverlayModalProps = {
  visible: boolean;
  initialItem?: TextOverlayItem | null;
  onClose: () => void;
  onAddText?: (overlay: TextOverlayItem) => void;
  onSaveText?: (overlay: TextOverlayItem) => void;
};

export default function TextOverlayModal({
  visible,
  initialItem,
  onClose,
  onAddText,
  onSaveText,
}: TextOverlayModalProps) {
  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(colors.white);
  const [bgMode, setBgMode] = useState<TextBgMode>("solid");
  const [fontStyle, setFontStyle] = useState<TextStyleMode>("bold");
  const [textAlign, setTextAlign] = useState<TextAlignMode>("center");
  const [fontSize, setFontSize] = useState<number>(28);

  useEffect(() => {
    if (visible) {
      if (initialItem) {
        setText(initialItem.text || "");
        setSelectedColor(initialItem.color || colors.white);
        setBgMode(
          initialItem.bgMode || (initialItem.bgColor ? "solid" : "transparent")
        );
        setFontStyle(initialItem.fontStyle || "bold");
        setTextAlign(initialItem.textAlign || "center");
        setFontSize(initialItem.fontSize || 28);
      } else {
        setText("");
        setSelectedColor(colors.white);
        setBgMode("solid");
        setFontStyle("bold");
        setTextAlign("center");
        setFontSize(28);
      }
    }
  }, [visible, initialItem]);

  const cycleBgMode = () => {
    Haptics.selectionAsync();
    const currentIndex = BG_MODES.findIndex((m) => m.id === bgMode);
    const nextMode = BG_MODES[(currentIndex + 1) % BG_MODES.length].id;
    setBgMode(nextMode);
  };

  const cycleAlignment = () => {
    Haptics.selectionAsync();
    const alignments: TextAlignMode[] = ["left", "center", "right"];
    const currentIndex = alignments.indexOf(textAlign);
    setTextAlign(alignments[(currentIndex + 1) % alignments.length]);
  };

  const handleDone = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onClose();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Compute effective text & bg colors
    let effectiveTextColor = selectedColor;
    let effectiveBgColor: string | undefined = undefined;

    if (bgMode === "solid") {
      effectiveBgColor = selectedColor === colors.white ? colors.white : selectedColor;
      effectiveTextColor = selectedColor === colors.white ? colors.black : colors.white;
    } else if (bgMode === "frosted") {
      effectiveBgColor = "rgba(0,0,0,0.5)";
      effectiveTextColor = selectedColor;
    } else if (bgMode === "outline") {
      effectiveBgColor = "transparent";
      effectiveTextColor = selectedColor;
    } else {
      effectiveBgColor = "transparent";
      effectiveTextColor = selectedColor;
    }

    const payload: TextOverlayItem = {
      id: initialItem?.id || Date.now().toString(),
      text: trimmed,
      color: effectiveTextColor,
      bgColor: effectiveBgColor,
      bgMode,
      fontStyle,
      textAlign,
      fontSize,
      x: initialItem?.x,
      y: initialItem?.y,
      scale: initialItem?.scale,
      rotation: initialItem?.rotation,
    };

    if (onSaveText) {
      onSaveText(payload);
    } else if (onAddText) {
      onAddText(payload);
    }

    setText("");
    onClose();
  };

  const getPreviewTextStyle = () => {
    let style: any = {
      fontSize,
      textAlign,
      color:
        bgMode === "solid"
          ? selectedColor === colors.white
            ? colors.black
            : colors.white
          : selectedColor,
    };

    switch (fontStyle) {
      case "classic":
        style.fontWeight = "600";
        break;
      case "bold":
        style.fontWeight = "900";
        style.letterSpacing = 0.5;
        break;
      case "neon":
        style.fontWeight = "800";
        style.textShadowColor = selectedColor;
        style.textShadowOffset = { width: 0, height: 0 };
        style.textShadowRadius = 14;
        break;
      case "typewriter":
        style.fontFamily = "monospace";
        style.fontWeight = "700";
        break;
      case "italic":
        style.fontStyle = "italic";
        style.fontWeight = "700";
        break;
      default:
        style.fontWeight = "bold";
    }

    return style;
  };

  const getPreviewContainerStyle = () => {
    if (bgMode === "solid") {
      return {
        backgroundColor:
          selectedColor === colors.white ? colors.white : selectedColor,
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 10,
      };
    }

    if (bgMode === "frosted") {
      return {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
      };
    }

    if (bgMode === "outline") {
      return {
        backgroundColor: "transparent",
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: selectedColor,
      };
    }

    return {
      backgroundColor: "transparent",
      paddingHorizontal: 12,
      paddingVertical: 6,
    };
  };

  const getAlignmentIcon = (): keyof typeof Ionicons.glyphMap => {
    if (textAlign === "left") return "reorder-two-outline";
    if (textAlign === "right") return "reorder-three-outline";
    return "reorder-four-outline";
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
        style={styles.modalBackdrop}
      >
        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setText("");
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close text editor"
            style={styles.circleBtn}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Center Toolbar (Alignment, Background Style, Size) */}
          <View style={styles.centerToolbar}>
            {/* Text Alignment */}
            <TouchableOpacity
              onPress={cycleAlignment}
              style={styles.toolbarPillBtn}
            >
              <Ionicons name={getAlignmentIcon()} size={18} color="white" />
            </TouchableOpacity>

            {/* Background Highlight Mode */}
            <TouchableOpacity
              onPress={cycleBgMode}
              style={styles.toolbarPillBtn}
            >
              <Ionicons
                name={
                  BG_MODES.find((m) => m.id === bgMode)?.icon || "square-outline"
                }
                size={18}
                color="white"
              />
              <Text style={styles.toolbarPillText}>
                {BG_MODES.find((m) => m.id === bgMode)?.label}
              </Text>
            </TouchableOpacity>

            {/* Font Size Selector */}
            <View style={styles.sizeGroup}>
              {FONT_SIZES.map((sz) => (
                <TouchableOpacity
                  key={sz.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFontSize(sz.size);
                  }}
                  style={[
                    styles.sizeBtn,
                    fontSize === sz.size && styles.sizeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sizeBtnText,
                      fontSize === sz.size && styles.sizeBtnTextActive,
                    ]}
                  >
                    {sz.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Done CTA */}
          <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Live Input Field (Centered in screen) */}
        <View style={styles.inputCanvas}>
          <View style={[styles.inputBox, getPreviewContainerStyle()]}>
            <TextInput
              placeholder="Type something..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              textAlign={textAlign}
              style={[styles.textInput, getPreviewTextStyle()]}
            />
          </View>
        </View>

        {/* Bottom Drawer: Font Styles & Color Swatches */}
        <View style={styles.bottomDrawer}>
          {/* Font Style Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fontPillRow}
          >
            {FONT_STYLES.map((f) => {
              const active = fontStyle === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFontStyle(f.id);
                  }}
                  style={[
                    styles.fontPill,
                    active && styles.fontPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fontPillText,
                      active && styles.fontPillTextActive,
                      f.id === "typewriter" && { fontFamily: "monospace" },
                      f.id === "italic" && { fontStyle: "italic" },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Color Swatch Circles */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorSwatchRow}
          >
            {COLOR_PALETTE.map((color) => {
              const active = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedColor(color);
                  }}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    active && styles.colorCircleActive,
                  ]}
                >
                  {active && (
                    <View
                      style={[
                        styles.colorInnerDot,
                        {
                          backgroundColor:
                            color === colors.white ? colors.black : colors.white,
                        },
                      ]}
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

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 54 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 20,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolbarPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  toolbarPillText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  sizeGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  sizeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sizeBtnActive: {
    backgroundColor: "white",
  },
  sizeBtnText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontWeight: "800",
  },
  sizeBtnTextActive: {
    color: "black",
  },
  doneBtn: {
    backgroundColor: colors.blue[600],
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: colors.blue[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  doneBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },
  inputCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  inputBox: {
    minWidth: 140,
    maxWidth: "92%",
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    minHeight: 48,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bottomDrawer: {
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    backgroundColor: "rgba(10, 10, 15, 0.95)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 14,
  },
  fontPillRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  fontPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  fontPillActive: {
    backgroundColor: "white",
    borderColor: "white",
  },
  fontPillText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "700",
  },
  fontPillTextActive: {
    color: "black",
    fontWeight: "800",
  },
  colorSwatchRow: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: "center",
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleActive: {
    borderColor: "white",
    transform: [{ scale: 1.15 }],
  },
  colorInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

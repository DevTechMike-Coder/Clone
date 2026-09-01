import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { TextOverlayItem } from "@/store/pendingPost";

type DraggableTextOverlayProps = {
  item: TextOverlayItem;
  isSelected: boolean;
  containerWidth: number;
  containerHeight: number;
  onSelect: () => void;
  onEdit: (item: TextOverlayItem) => void;
  onDelete: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onDragStart?: () => void;
  onDragMove?: (screenY: number) => void;
  onDragEnd?: (isOverTrash: boolean) => void;
  isOverTrash?: boolean;
};

export default function DraggableTextOverlay({
  item,
  isSelected,
  containerWidth,
  containerHeight,
  onSelect,
  onEdit,
  onDelete,
  onPositionChange,
  onDragStart,
  onDragMove,
  onDragEnd,
  isOverTrash = false,
}: DraggableTextOverlayProps) {
  // Current position animated values
  const pan = useRef(
    new Animated.ValueXY({
      x: item.x ?? 0,
      y: item.y ?? 0,
    })
  ).current;

  const dragScale = useRef(new Animated.Value(1)).current;
  const currentPos = useRef({ x: item.x ?? 0, y: item.y ?? 0 });
  const isDraggingRef = useRef(false);

  useEffect(() => {
    currentPos.current = { x: item.x ?? 0, y: item.y ?? 0 };
    pan.setValue({ x: item.x ?? 0, y: item.y ?? 0 });
  }, [item.x, item.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });

        Animated.spring(dragScale, {
          toValue: 1.08,
          useNativeDriver: true,
          friction: 6,
        }).start();

        onSelect();
        onDragStart?.();
      },
      onPanResponderMove: (e, gestureState) => {
        if (!isDraggingRef.current) {
          if (
            Math.abs(gestureState.dx) > 5 ||
            Math.abs(gestureState.dy) > 5
          ) {
            isDraggingRef.current = true;
          }
        }
        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
        onDragMove?.(gestureState.moveY);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        Animated.spring(dragScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }).start();

        const finalX = currentPos.current.x + gestureState.dx;
        const finalY = currentPos.current.y + gestureState.dy;
        currentPos.current = { x: finalX, y: finalY };

        onPositionChange(item.id, finalX, finalY);
        onDragEnd?.(isOverTrash);

        // If it was just a tap without dragging, keep selected or open edit
        if (!isDraggingRef.current) {
          onSelect();
        }
      },
    })
  ).current;

  // Typography styling based on fontStyle and bgMode
  const getTextStyle = () => {
    const fontStyle = item.fontStyle || "bold";
    const textAlign = item.textAlign || "center";
    const fontSize = item.fontSize || 26;

    let fontFamilyStyle: any = {
      fontSize,
      textAlign,
      color: item.color,
    };

    switch (fontStyle) {
      case "classic":
        fontFamilyStyle.fontWeight = "600";
        break;
      case "bold":
        fontFamilyStyle.fontWeight = "900";
        fontFamilyStyle.letterSpacing = 0.5;
        break;
      case "neon":
        fontFamilyStyle.fontWeight = "800";
        fontFamilyStyle.textShadowColor = item.color;
        fontFamilyStyle.textShadowOffset = { width: 0, height: 0 };
        fontFamilyStyle.textShadowRadius = 14;
        break;
      case "typewriter":
        fontFamilyStyle.fontFamily = "monospace";
        fontFamilyStyle.fontWeight = "700";
        break;
      case "italic":
        fontFamilyStyle.fontStyle = "italic";
        fontFamilyStyle.fontWeight = "700";
        break;
      default:
        fontFamilyStyle.fontWeight = "bold";
    }

    return fontFamilyStyle;
  };

  const getContainerBgStyle = () => {
    const bgMode = item.bgMode || (item.bgColor ? "solid" : "transparent");

    if (bgMode === "solid") {
      return {
        backgroundColor: item.bgColor || "rgba(0,0,0,0.7)",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
      };
    }

    if (bgMode === "frosted") {
      return {
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
      };
    }

    if (bgMode === "outline") {
      return {
        backgroundColor: "transparent",
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 2,
        borderColor: item.color,
      };
    }

    return {
      backgroundColor: "transparent",
      paddingHorizontal: 8,
      paddingVertical: 4,
    };
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.overlayContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: dragScale },
          ],
        },
      ]}
    >
      <View
        style={[
          getContainerBgStyle(),
          isSelected && styles.selectedBorder,
          isOverTrash && styles.trashHighlight,
        ]}
      >
        <Text style={getTextStyle()}>{item.text}</Text>

        {/* Selected Controls Overlay */}
        {isSelected && (
          <View style={styles.actionPillRow}>
            {/* Edit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onEdit(item);
              }}
              style={styles.actionCircleBtn}
            >
              <Ionicons name="pencil" size={13} color="white" />
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete(item.id);
              }}
              style={[styles.actionCircleBtn, styles.deleteCircleBtn]}
            >
              <Ionicons name="close" size={14} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 30,
  },
  selectedBorder: {
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.9)",
    borderStyle: "dashed",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  trashHighlight: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.35)",
  },
  actionPillRow: {
    position: "absolute",
    top: -34,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  actionCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCircleBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.85)",
  },
});

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import {
  REPORT_REASONS,
  ReportReason,
  moderationService,
} from "@/services/moderationService";
import { colors } from "@/constants/theme";

type ReportSheetProps = {
  visible: boolean;
  /** Exactly one of these is set, matching the reports table's one-target rule. */
  postId?: string;
  userId?: string;
  onClose: () => void;
  /** Called after a report is filed (e.g. to hide the reported content). */
  onReported?: () => void;
};

/**
 * Bottom-sheet report flow shared by post menus and profiles. Kept as a
 * sheet (instead of Alert) because Android's Alert renders at most three
 * buttons — the moderation reason list needs more.
 */
const ReportSheet = ({
  visible,
  postId,
  userId,
  onClose,
  onReported,
}: ReportSheetProps) => {
  const [submitting, setSubmitting] = useState<ReportReason | null>(null);

  useEffect(() => {
    if (!visible) setSubmitting(null);
  }, [visible]);

  const handlePick = async (reason: ReportReason) => {
    if (submitting) return;
    setSubmitting(reason);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = postId
        ? await moderationService.reportPost(postId, reason)
        : await moderationService.reportUser(userId!, reason);

      onClose();
      if (result === "duplicate") {
        Toast.show({
          type: "info",
          text1: "Already reported",
          text2: "Our team is reviewing your earlier report.",
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Report submitted",
          text2: "Thanks — we'll review this shortly.",
        });
      }
      onReported?.();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't submit report",
        text2: error?.message || "Please try again.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/45 justify-end">
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Dismiss report sheet"
        />

        <View className="bg-white dark:bg-slate-900 rounded-t-3xl border border-slate-100 dark:border-slate-800 px-6 pt-4 pb-10">
          <View className="items-center mb-3">
            <View className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          </View>

          <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {postId ? "Report post" : "Report user"}
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
            {"Tell us what's wrong. Reports are anonymous."}
          </Text>

          <ScrollView style={{ maxHeight: 340 }}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => handlePick(reason.id)}
                disabled={!!submitting}
                activeOpacity={0.7}
                className="flex-row items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-800"
              >
                <Text className="text-base text-slate-800 dark:text-slate-100">
                  {reason.label}
                </Text>
                {submitting === reason.id ? (
                  <ActivityIndicator size="small" color={colors.red[500]} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.slate[400]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            disabled={!!submitting}
            className="mt-4 h-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
          >
            <Text className="font-semibold text-slate-700 dark:text-slate-200">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ReportSheet;

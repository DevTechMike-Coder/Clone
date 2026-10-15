import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  ScreenHeader,
  Text,
  Button,
  IconButton,
  Avatar,
  TextField,
  ListSection,
  ListRow,
  SegmentedTabs,
  Badge,
  EmptyState,
  Skeleton,
  BottomSheet,
  Dialog,
} from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";

export default function UIGalleryScreen() {
  const { isDark, toggleTheme, themePreference, setThemePreference } = useTheme();

  // State for interactive demos
  const [activeTab, setActiveTab] = useState("all");
  const [activeUnderlineTab, setActiveUnderlineTab] = useState("posts");
  const [switchVal, setSwitchVal] = useState(true);
  const [inputVal, setInputVal] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader
        title="UI Component Gallery"
        subtitle="__DEV__ Primitive Matrix"
        rightAction={
          <IconButton
            icon={
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={22}
                color={isDark ? "#FACC15" : "#475569"}
              />
            }
            accessibilityLabel="Toggle Theme"
            onPress={toggleTheme}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Theme Control */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            THEME CONTROLLER
          </Text>
          <SegmentedTabs
            tabs={[
              { key: "system", label: "System" },
              { key: "light", label: "Light" },
              { key: "dark", label: "Dark" },
            ]}
            activeTab={themePreference}
            onTabChange={(mode) => setThemePreference(mode as any)}
          />
        </View>

        {/* Section: Typography */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            TYPOGRAPHY (PLUS JAKARTA SANS)
          </Text>
          <Text variant="display">Display 32pt</Text>
          <Text variant="title">Title 22pt</Text>
          <Text variant="headline">Headline 17pt</Text>
          <Text variant="body">Body 15pt - clean readable body text</Text>
          <Text variant="bodyMedium">BodyMedium 15pt</Text>
          <Text variant="caption" color="muted">
            Caption 13pt - secondary metadata
          </Text>
          <Text variant="micro" color="accent">
            Micro 11pt - smallest floor token
          </Text>
        </View>

        {/* Section: Buttons */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            BUTTONS (VARIANTS & SIZES)
          </Text>
          <View style={styles.rowWrap}>
            <Button title="Primary" variant="primary" size="md" />
            <Button title="Secondary" variant="secondary" size="md" />
            <Button title="Outline" variant="outline" size="md" />
            <Button title="Ghost" variant="ghost" size="md" />
            <Button title="Danger" variant="danger" size="md" />
          </View>

          <View style={[styles.rowWrap, { marginTop: 12 }]}>
            <Button title="Small CTA" size="sm" />
            <Button title="Medium CTA" size="md" />
            <Button title="Large CTA" size="lg" />
            <Button
              title="Loading"
              loading={btnLoading}
              onPress={() => {
                setBtnLoading(true);
                setTimeout(() => setBtnLoading(false), 2000);
              }}
            />
            <Button title="Disabled" disabled />
          </View>
        </View>

        {/* Section: IconButtons & Badges */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            ICON BUTTONS (44PT TOUCH TARGET) & BADGES
          </Text>
          <View style={styles.row}>
            <IconButton
              icon={<Ionicons name="heart-outline" size={22} color="#EF4444" />}
              accessibilityLabel="Like"
              variant="filled"
            />
            <IconButton
              icon={<Ionicons name="bookmark-outline" size={22} color="#3B82F6" />}
              accessibilityLabel="Bookmark"
              variant="tinted"
            />
            <IconButton
              icon={<Ionicons name="paper-plane-outline" size={22} color="#10B981" />}
              accessibilityLabel="Share"
              variant="ghost"
            />
            <IconButton
              icon={<Ionicons name="add" size={24} color="#FFFFFF" />}
              accessibilityLabel="Add"
              variant="primary"
            />

            <View style={styles.badgeRow}>
              <Badge content="99+" variant="danger" />
              <Badge content="NEW" variant="primary" size="sm" />
              <Badge dot variant="success" />
              <Badge variant="verified" />
            </View>
          </View>
        </View>

        {/* Section: Avatars */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            AVATARS (IMAGE, FALLBACK & STORY RING)
          </Text>
          <View style={styles.row}>
            <Avatar name="Sarah Connor" size="sm" />
            <Avatar name="Alex Rivera" size="md" />
            <Avatar
              url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
              size="lg"
              hasStory
              isStoryViewed={false}
            />
            <Avatar
              url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
              size="lg"
              hasStory
              isStoryViewed
            />
            <Avatar name="Elena Doe" size="xl" />
          </View>
        </View>

        {/* Section: TextFields */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            TEXT INPUTS (FOCUS RINGS, PASSWORD TOGGLE, ERRORS)
          </Text>
          <TextField
            label="Username"
            placeholder="e.g. alex_rivera"
            value={inputVal}
            onChangeText={setInputVal}
            helperText="Your public handle across Clone"
            leftIcon={<Ionicons name="at-outline" size={18} color="#94A3B8" />}
          />
          <TextField
            label="Password"
            placeholder="Enter secure password"
            secureTextEntry
            showPasswordToggle
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />}
          />
          <TextField
            label="Email with Validation"
            value="invalid-email@"
            errorText="Please enter a valid email address"
            leftIcon={<Ionicons name="mail-outline" size={18} color="#EF4444" />}
          />
        </View>

        {/* Section: Segmented Tabs */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            SEGMENTED TABS (PILL & UNDERLINE)
          </Text>
          <SegmentedTabs
            tabs={[
              { key: "all", label: "All Items", badge: 14 },
              { key: "unread", label: "Unread", badge: 3 },
              { key: "archived", label: "Archived" },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            style={{ marginBottom: 16 }}
          />

          <SegmentedTabs
            variant="underline"
            tabs={[
              {
                key: "posts",
                label: "Posts",
                icon: (a) => (
                  <Ionicons name="grid-outline" size={16} color={a ? "#2563EB" : "#94A3B8"} />
                ),
              },
              {
                key: "reposts",
                label: "Reposts",
                icon: (a) => (
                  <Ionicons name="repeat-outline" size={16} color={a ? "#2563EB" : "#94A3B8"} />
                ),
              },
              {
                key: "saved",
                label: "Saved",
                icon: (a) => (
                  <Ionicons name="bookmark-outline" size={16} color={a ? "#2563EB" : "#94A3B8"} />
                ),
              },
            ]}
            activeTab={activeUnderlineTab}
            onTabChange={setActiveUnderlineTab}
          />
        </View>

        {/* Section: List Rows & Section */}
        <View style={styles.section}>
          <ListSection title="Account & Preferences" footer="Configured locally on this device">
            <ListRow
              icon={<Ionicons name="notifications-outline" size={18} color="#3B82F6" />}
              title="Push Notifications"
              subtitle="Mentions, replies, and direct messages"
              isSwitch
              switchValue={switchVal}
              onSwitchChange={setSwitchVal}
            />
            <ListRow
              icon={<Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />}
              title="Security & 2FA"
              value="Enabled"
              onPress={() => {}}
            />
            <ListRow
              icon={<Ionicons name="log-out-outline" size={18} color="#EF4444" />}
              title="Log Out"
              destructive
              showChevron={false}
              onPress={() => setDialogVisible(true)}
            />
          </ListSection>
        </View>

        {/* Section: Skeletons */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            SKELETONS (PULSE ANIMATION PRESETS)
          </Text>
          <Skeleton.Row style={{ marginBottom: 12 }} />
          <Skeleton.PostCard />
        </View>

        {/* Section: Empty State */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            EMPTY STATE
          </Text>
          <EmptyState
            icon={<Ionicons name="images-outline" size={32} color="#3B82F6" />}
            title="No Posts Yet"
            description="When you share photos or videos, they will appear here on your profile."
            actionTitle="Create Your First Post"
            onActionPress={() => {}}
          />
        </View>

        {/* Section: Modals Trigger */}
        <View style={styles.section}>
          <Text variant="caption" weight="semibold" color="muted" style={styles.sectionHeader}>
            MODALS & SHEETS (REANIMATED)
          </Text>
          <View style={styles.row}>
            <Button
              title="Open BottomSheet"
              variant="outline"
              onPress={() => setSheetVisible(true)}
            />
            <Button
              title="Open Dialog"
              variant="danger"
              onPress={() => setDialogVisible(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Interactive BottomSheet Demo */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Options & Actions"
      >
        <View style={{ padding: 16 }}>
          <Text variant="body" color="muted" style={{ marginBottom: 16 }}>
            This custom BottomSheet is built with Reanimated 4.5 and Gesture Handler. It supports
            drag-to-dismiss gestures and smooth spring animations.
          </Text>
          <Button
            title="Done"
            variant="primary"
            fullWidth
            onPress={() => setSheetVisible(false)}
          />
        </View>
      </BottomSheet>

      {/* Interactive Dialog Demo */}
      <Dialog
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title="Log Out of Clone?"
        message="Are you sure you want to log out? You can sign back in anytime."
        confirmText="Log Out"
        cancelText="Cancel"
        destructive
        onConfirm={() => setDialogVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
});

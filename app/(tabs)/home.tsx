import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, IconButton, Badge, BottomSheet, ListSection, ListRow } from "@/components/ui";
import IndexVideoFeed from "@/components/IndexVideoFeed";
import { Post } from "@/services/postService";
import { bookmarkService } from "@/services/bookmarkService";
import { shareService } from "@/services/shareService";
import { notificationService } from "@/services/notificationService";
import { useTheme } from "@/context/ThemeContext";
import Toast from "react-native-toast-message";

export default function HomeScreen() {
  const { palette } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch unread count whenever home tab gains focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const count = await notificationService.getUnreadCount();
          if (isMounted) setUnreadNotifications(count);
        } catch {
          // Non-blocking
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const openMenu = (post: Post) => {
    setSelectedPost(post);
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setSelectedPost(null);
  };

  const handleMenuBookmark = async () => {
    if (!selectedPost) return;
    try {
      const res = await bookmarkService.toggleBookmark(selectedPost.id);
      setSelectedPost((prev) =>
        prev ? { ...prev, is_bookmarked: res.bookmarked } : null
      );
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Post Bookmarked" : "Bookmark Removed",
        text2: res.bookmarked
          ? "Post saved to your profile"
          : "Post removed from saved",
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update bookmark",
      });
    } finally {
      closeMenu();
    }
  };

  const handleMenuShare = async () => {
    if (!selectedPost) return;
    try {
      await shareService.sharePost(selectedPost);
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to share post",
      });
    } finally {
      closeMenu();
    }
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: palette.background }}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: palette.background,
            borderBottomColor: palette.borderSubtle,
          },
        ]}
      >
        {/* Brand Logo & Wordmark */}
        <View style={styles.brandContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logoIcon}
          />
          <Text variant="title" weight="bold" style={styles.brandTitle}>
            CLONE
          </Text>
        </View>

        {/* Right Action: Notifications Bell with Unread Dot */}
        <View style={styles.notificationWrapper}>
          <IconButton
            icon={
              <Ionicons
                name="notifications-outline"
                size={23}
                color={palette.text}
              />
            }
            accessibilityLabel="Notifications"
            onPress={() => router.push("/inbox")}
          />
          {unreadNotifications > 0 && (
            <View style={styles.badgePosition}>
              <Badge dot variant="danger" />
            </View>
          )}
        </View>
      </View>

      {/* Main Video & Media Feed */}
      <IndexVideoFeed onOptionsPress={openMenu} />

      {/* Post Actions Bottom Sheet */}
      <BottomSheet
        visible={isMenuOpen}
        onClose={closeMenu}
        title="Post Options"
      >
        <View style={styles.sheetContainer}>
          <ListSection>
            <ListRow
              icon={<Ionicons name="person-outline" size={19} color={palette.accent} />}
              title="View Profile"
              subtitle={selectedPost?.profiles?.username ? `@${selectedPost.profiles.username}` : undefined}
              onPress={() => {
                if (selectedPost) {
                  const uid = selectedPost.user_id;
                  closeMenu();
                  router.push({
                    pathname: "/(pages)/userProfile",
                    params: { userId: uid },
                  });
                }
              }}
            />
            <ListRow
              icon={
                <Ionicons
                  name={selectedPost?.is_bookmarked ? "bookmark" : "bookmark-outline"}
                  size={19}
                  color={palette.accent}
                />
              }
              title={selectedPost?.is_bookmarked ? "Remove Bookmark" : "Bookmark Post"}
              subtitle="Save to your private bookmarks"
              onPress={handleMenuBookmark}
            />
            <ListRow
              icon={<Ionicons name="paper-plane-outline" size={19} color={palette.success} />}
              title="Share Post"
              subtitle="Share via external apps or links"
              onPress={handleMenuShare}
            />
            <ListRow
              icon={<Ionicons name="eye-off-outline" size={19} color={palette.muted} />}
              title="Not Interested"
              subtitle="See fewer posts like this"
              onPress={closeMenu}
            />
            <ListRow
              icon={<Ionicons name="flag-outline" size={19} color={palette.danger} />}
              title="Report Post"
              destructive
              onPress={closeMenu}
            />
          </ListSection>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandTitle: {
    letterSpacing: -0.5,
  },
  notificationWrapper: {
    position: "relative",
  },
  badgePosition: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  sheetContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
});

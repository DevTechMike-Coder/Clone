import { Share, Platform } from "react-native";
import Toast from "react-native-toast-message";
import { Post } from "./postService";

export const shareService = {
  sharePost: async (post: Post) => {
    try {
      const username = post.profiles?.username || "user";
      const title = `Check out @${username}'s post on Clone`;
      const message = post.caption 
        ? `"${post.caption}" by @${username} on Clone: ${post.media_url}`
        : `Check out this post by @${username} on Clone: ${post.media_url}`;

      const result = await Share.share(
        Platform.select({
          ios: {
            title,
            message,
            url: post.media_url,
          },
          default: {
            title,
            message,
          },
        })!
      );

      if (result.action === Share.sharedAction) {
        Toast.show({
          type: "success",
          text1: "Shared!",
          text2: "Post shared successfully.",
          visibilityTime: 2000,
        });
      }
    } catch (error: any) {
      console.error("Error sharing post:", error);
      Toast.show({
        type: "error",
        text1: "Share Error",
        text2: error.message || "Failed to share post",
      });
    }
  },
};

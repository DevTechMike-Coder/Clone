import home from "@/assets/tabIcons/home.png";
import chat from "@/assets/tabIcons/chat.png";
import search from "@/assets/tabIcons/search.png";
import user from "@/assets/tabIcons/user.png";

export const icons = {
  home,
  chat,
  search,
  user,
} as const;

export type IconKey = keyof typeof icons;

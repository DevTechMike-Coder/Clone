import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import AuthSplash from "@/components/AuthSplash";

export default function PagesLayout() {
  const { session, loading } = useAuth();
  const { palette } = useTheme();

  if (loading) {
    return <AuthSplash />;
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    />
  );
}

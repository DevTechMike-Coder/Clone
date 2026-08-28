import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import AuthSplash from "@/components/AuthSplash";

export default function PagesLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <AuthSplash />;
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

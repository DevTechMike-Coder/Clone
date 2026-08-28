import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Toast from "react-native-toast-message";
import AuthSplash from "@/components/AuthSplash";

function RootNavigation() {
  const { loading } = useAuth();

  if (loading) {
    return <AuthSplash />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
      <Toast />
    </AuthProvider>
  );
}

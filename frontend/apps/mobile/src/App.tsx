import React, { useCallback, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Provider as PaperProvider } from "react-native-paper";
import useCachedResources from "./hooks/useCachedResources";
import useColorScheme from "./hooks/useColorScheme";
import Navigation from "./navigation";
import {MaterialIcons} from "@expo/vector-icons";
import { CombinedDarkTheme, CombinedDefaultTheme } from "./theme";
import { PreferencesContext } from "./core/preferences";
import SplashScreen from "./screens/SplashScreen";
import { RecoilRoot } from "recoil";
import { NotificationProvider } from "./notifications";

export default function App() {
  const isLoadingComplete = useCachedResources();
  const colorScheme = useColorScheme(); // TODO: incorporate

  const [isThemeDark, setIsThemeDark] = useState(true);
  const theme = isThemeDark ? CombinedDarkTheme : CombinedDefaultTheme;

  const toggleTheme = useCallback(() => {
    return setIsThemeDark(!isThemeDark);
  }, [isThemeDark]);

  const preferences = useMemo(
    () => ({
      toggleTheme,
      isThemeDark,
    }),
    [toggleTheme, isThemeDark],
  );

  if (!isLoadingComplete) {
    return <SplashScreen />;
  } else {
    return (
      <RecoilRoot>
        <PreferencesContext.Provider value={preferences}>
          <PaperProvider
            theme={theme}
            settings={{
              icon: props => <MaterialIcons {...props} />,
            }}
          >
            <SafeAreaProvider>
              <React.Suspense fallback={<SplashScreen />}>
                <Navigation theme={theme} />
              </React.Suspense>
              <NotificationProvider />
              <StatusBar />
            </SafeAreaProvider>
          </PaperProvider>
        </PreferencesContext.Provider>
      </RecoilRoot>
    );
  }
}

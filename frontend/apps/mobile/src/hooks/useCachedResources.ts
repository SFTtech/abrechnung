// import * as Font from "expo-font";
// import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";

export const useCachedResources = () => {
    const [isLoadingComplete, setLoadingComplete] = useState(true);

    // Load any resources or data that we need prior to rendering the app
    // useEffect(() => {
    //     async function loadResourcesAndDataAsync() {
    //         try {
    //             SplashScreen.preventAutoHideAsync();

    //             // Load fonts
    //             await Font.loadAsync({
    //                 ...FontAwesome.font,
    //                 ...MaterialCommunityIcons.font,
    //                 ...MaterialIcons.font,
    //                 "space-mono": require("../../assets/SpaceMono-Regular.ttf"),
    //             });
    //         } catch (e) {
    //             // We might want to provide this error information to an error reporting service
    //             console.warn(e);
    //         } finally {
    //             setLoadingComplete(true);
    //             SplashScreen.hideAsync();
    //         }
    //     }

    //     loadResourcesAndDataAsync();
    // }, []);

    return isLoadingComplete;
};

export default useCachedResources;

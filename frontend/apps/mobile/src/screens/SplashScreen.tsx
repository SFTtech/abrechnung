import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

export const SplashScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <ActivityIndicator animating={true} />
            <Text>Splash screen</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
    },
});

export default SplashScreen;

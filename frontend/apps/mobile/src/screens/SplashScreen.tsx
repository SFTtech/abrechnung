import React from "react";
import { StyleSheet, View } from "react-native";
import LogoSvg from "../assets/logo.svg";

export const SplashScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <LogoSvg height="100%" />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        height: 150,
    },
});

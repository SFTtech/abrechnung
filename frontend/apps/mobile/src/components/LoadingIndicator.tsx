import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export const LoadingIndicator: React.FC = () => {
    return (
        <View style={styles.container}>
            <ActivityIndicator animating={true} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
    },
});

export default LoadingIndicator;

import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

import { RootDrawerScreenProps } from "../navigation/types";

export const NotFoundScreen: React.FC<RootDrawerScreenProps<"NotFound">> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.link}>
                <Text style={styles.linkText}>Go to home screen!</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
    linkText: {
        fontSize: 14,
        color: "#2e78b7",
    },
});

export default NotFoundScreen;

import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { RootDrawerScreenProps } from "../navigation/types";

export const Register: React.FC<RootDrawerScreenProps<"Register">> = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: "80%",
    },
});

export default Register;

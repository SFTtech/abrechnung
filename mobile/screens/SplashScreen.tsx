import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export default function SplashScreen() {
    return (
        <View style={styles.container}>
            <ActivityIndicator animating={true} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
    },
});
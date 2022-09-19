import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { nameValidator, passwordValidator, urlValidator } from "../core/validators";
import { RootDrawerScreenProps } from "../types";
import { Appbar, Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { login } from "../core/api/auth";
import { useSetRecoilState } from "recoil";
import { authState } from "../core/auth";
import { notify } from "../notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen({ navigation }: RootDrawerScreenProps<"Login">) {
    const theme = useTheme();
    const setAuthState = useSetRecoilState(authState);

    const [server, setServer] = useState({
        value: "http://192.168.178.26:8080",
        error: "",
    });
    const [username, setUsername] = useState({ value: "", error: "" });
    const [password, setPassword] = useState({ value: "", error: "" });

    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword((oldVal) => !oldVal);
    };

    const onLoginPressed = () => {
        const usernameError = nameValidator(username.value);
        const passwordError = passwordValidator(password.value);
        const urlError = urlValidator(server.value);

        if (usernameError || passwordError || urlError) {
            setUsername({ ...username, error: usernameError });
            setPassword({ ...password, error: passwordError });
            setServer({ ...server, error: urlError });
            return;
        }

        login({
            server: server.value,
            username: username.value,
            password: password.value,
        })
            .then((result) => {
                console.log("logged in with result", result);
                setAuthState({
                    isLoading: false,
                    isLoggedIn: true,
                });
            })
            .catch((err) => {
                console.log("error on login", err);
                notify({ text: err.toString() });
            });
    };

    return (
        <>
            <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
                <Appbar.Content title="Abrechnung" />
            </Appbar.Header>
            <View style={styles.container}>
                <TextInput
                    label="Server"
                    returnKeyType="next"
                    value={server.value}
                    onChangeText={(text) => setServer({ value: text, error: "" })}
                    error={!!server.error}
                    // errorText={email.error}
                    autoCapitalize="none"
                    // autoCompleteType="email"
                    textContentType="URL"
                    keyboardType="url"
                />
                <HelperText type="error" visible={!!server.error}>
                    {server.error}
                </HelperText>

                <TextInput
                    label="Username"
                    returnKeyType="next"
                    value={username.value}
                    onChangeText={(text) => setUsername({ value: text, error: "" })}
                    error={!!username.error}
                    // errorText={email.error}
                    autoCapitalize="none"
                    // autoCompleteType="email"
                    textContentType="username"
                />
                <HelperText type="error" visible={!!username.error}>
                    {username.error}
                </HelperText>

                <TextInput
                    label="Password"
                    returnKeyType="done"
                    value={password.value}
                    onChangeText={(text) => setPassword({ value: text, error: "" })}
                    error={!!password.error}
                    // errorText={password.error}
                    secureTextEntry={!showPassword}
                    right={
                        <TextInput.Icon
                            name={({ color, size }) => (
                                <MaterialCommunityIcons
                                    name={showPassword ? "eye-off" : "eye"}
                                    color={color}
                                    size={size}
                                    onPress={toggleShowPassword}
                                />
                            )}
                        />
                    }
                />
                <HelperText type="error" visible={!!password.error}>
                    {password.error}
                </HelperText>

                <Button mode="contained" onPress={onLoginPressed}>
                    Login
                </Button>

                <View style={styles.row}>
                    <Text>Don’t have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                        <Text style={styles.link}>Sign up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    row: {
        flexDirection: "row",
        marginTop: 4,
    },
    link: {
        fontWeight: "bold",
        // color: theme.colors.primary,
    },
});

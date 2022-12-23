import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { RootDrawerScreenProps } from "../navigation/types";
import { Appbar, Button, HelperText, ProgressBar, Text, TextInput, useTheme } from "react-native-paper";
import { notify } from "../notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppDispatch } from "../store";
import { Formik, FormikHelpers } from "formik";
import { login } from "@abrechnung/redux";
import { api, websocket } from "../core/api";
import { z } from "zod";
import { SerializedError } from "@reduxjs/toolkit";
import { toFormikValidationSchema } from "@abrechnung/utils";

const validationSchema = z.object({
    server: z.string({ required_error: "server is required" }).url({ message: "invalid server url" }),
    username: z.string({ required_error: "username is required" }),
    password: z.string({ required_error: "password is required" }),
});
type FormSchema = z.infer<typeof validationSchema>;

export const LoginScreen: React.FC<RootDrawerScreenProps<"Login">> = ({ navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword((oldVal) => !oldVal);
    };

    const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
        dispatch(
            login({
                username: values.username,
                password: values.password,
                sessionName: "Abrechnung Mobile",
                apiUrl: values.server,
                api,
            })
        )
            .unwrap()
            .then(() => {
                websocket.setUrl(`${values.server.replace("http://", "ws://").replace("https://", "ws://")}/api/v1/ws`);
                setSubmitting(false);
            })
            .catch((err: SerializedError) => {
                console.log("error on login", err);
                if (err.message) {
                    notify({ text: err.message });
                }
                setSubmitting(false);
            });
    };

    return (
        <>
            <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
                <Appbar.Content title="Abrechnung" />
            </Appbar.Header>
            <Formik
                validationSchema={toFormikValidationSchema(validationSchema)}
                validateOnBlur={false}
                validateOnChange={false}
                initialValues={{
                    // server: "https://demo.abrechnung.sft.lol",
                    server: "http://192.168.178.26:8080",
                    username: "",
                    password: "",
                }}
                onSubmit={handleSubmit}
            >
                {({ values, touched, handleSubmit, handleBlur, isSubmitting, errors, setFieldValue }) => (
                    <View style={styles.container}>
                        <TextInput
                            label="Server"
                            style={styles.input}
                            returnKeyType="next"
                            autoCapitalize="none"
                            textContentType="URL"
                            keyboardType="url"
                            value={values.server}
                            onBlur={handleBlur("server")}
                            onChangeText={(val) => setFieldValue("server", val)}
                            error={touched.server && !!errors.server}
                        />
                        {touched.server && !!errors.server && <HelperText type="error">{errors.server}</HelperText>}

                        <TextInput
                            label="Username"
                            style={styles.input}
                            returnKeyType="next"
                            autoCapitalize="none"
                            textContentType="username"
                            value={values.username}
                            onBlur={handleBlur("username")}
                            onChangeText={(val) => setFieldValue("username", val)}
                            error={touched.username && !!errors.username}
                        />
                        {touched.username && !!errors.username && (
                            <HelperText type="error">{errors.username}</HelperText>
                        )}

                        <TextInput
                            label="Password"
                            style={styles.input}
                            returnKeyType="done"
                            textContentType="password"
                            autoCapitalize="none"
                            value={values.password}
                            onBlur={handleBlur("password")}
                            onChangeText={(val) => setFieldValue("password", val)}
                            error={touched.password && !!errors.password}
                            secureTextEntry={!showPassword}
                            right={
                                <TextInput.Icon
                                    icon={({ color, size }) => (
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
                        {touched.password && !!errors.password && (
                            <HelperText type="error">{errors.password}</HelperText>
                        )}

                        {isSubmitting ? <ProgressBar indeterminate={true} /> : null}
                        <Button mode="contained" style={styles.submit} onPress={handleSubmit}>
                            Login
                        </Button>

                        <View style={styles.row}>
                            <Text>Don’t have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                                <Text style={styles.link}>Sign up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Formik>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    row: {
        flexDirection: "row",
        marginTop: 8,
    },
    submit: {
        marginTop: 8,
    },
    input: {
        marginBottom: 6,
    },
    link: {
        fontWeight: "bold",
        // color: theme.colors.primary,
    },
});

export default LoginScreen;

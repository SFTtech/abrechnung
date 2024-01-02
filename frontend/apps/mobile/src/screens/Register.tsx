import { selectIsAuthenticated } from "@abrechnung/redux";
import { toFormikValidationSchema } from "@abrechnung/utils";
import { Formik, FormikHelpers } from "formik";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Appbar, Button, HelperText, ProgressBar, Text, TextInput, useTheme } from "react-native-paper";
import { z } from "zod";
import { useInitApi } from "../core/ApiProvider";
import { RootDrawerScreenProps } from "../navigation/types";
import { notify } from "../notifications";
import { selectAuthSlice, useAppSelector } from "../store";
import { useTranslation } from "react-i18next";
import { ApiError } from "@abrechnung/api";

const validationSchema = z
    .object({
        server: z.string({ required_error: "server is required" }).url({ message: "invalid server url" }),
        username: z.string({ required_error: "username is required" }),
        email: z.string({ required_error: "email is required" }).email({ message: "invalid email" }),
        password: z.string({ required_error: "password is required" }),
        password2: z.string({ required_error: "repeat the password" }),
    })
    .refine((data) => data.password === data.password2, {
        message: "Passwords do not match",
        path: ["password2"],
    });
type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
    server: "https://demo.abrechnung.sft.lol",
    username: "",
    email: "",
    password: "",
    password2: "",
};

export const Register: React.FC<RootDrawerScreenProps<"Register">> = ({ navigation }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const loggedIn = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));
    const initApi = useInitApi();

    React.useEffect(() => {
        if (loggedIn) {
            navigation.navigate("GroupStackNavigator");
        }
    }, [loggedIn, navigation]);

    const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
        const { api: newApi } = initApi(values.server);
        newApi.client.auth
            .register({ requestBody: { username: values.username, email: values.email, password: values.password } })
            .then(() => {
                notify({ text: `Registered successfully, please confirm your email before logging in...` });
                setSubmitting(false);
                navigation.navigate("Login");
            })
            .catch((err: ApiError) => {
                notify({ text: `${err.body.msg}` });
                setSubmitting(false);
            });
    };

    return (
        <>
            <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
                <Appbar.Content title={t("auth.register.title")} />
            </Appbar.Header>
            <Formik
                validationSchema={toFormikValidationSchema(validationSchema)}
                initialValues={initialValues}
                onSubmit={handleSubmit}
            >
                {({ values, handleBlur, setFieldValue, touched, handleSubmit, isSubmitting, errors }) => (
                    <View style={styles.container}>
                        <TextInput
                            label={t("common.server")}
                            style={styles.input}
                            returnKeyType="next"
                            autoCapitalize="none"
                            textContentType="URL"
                            keyboardType="url"
                            value={values.server}
                            onBlur={() => handleBlur("server")}
                            onChangeText={(val) => setFieldValue("server", val)}
                            error={touched.server && !!errors.server}
                        />
                        {touched.server && !!errors.server && <HelperText type="error">{errors.server}</HelperText>}

                        <TextInput
                            autoFocus={true}
                            label={t("common.username")}
                            style={styles.input}
                            textContentType="username"
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.username && !!errors.username}
                            onBlur={() => handleBlur("username")}
                            onChangeText={(val) => setFieldValue("username", val)}
                            value={values.username}
                        />
                        {touched.username && !!errors.username && (
                            <HelperText type="error">{errors.username}</HelperText>
                        )}

                        <TextInput
                            label={t("common.email")}
                            style={styles.input}
                            keyboardType="email-address"
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.email && !!errors.email}
                            onBlur={() => handleBlur("email")}
                            onChangeText={(val) => setFieldValue("email", val)}
                            value={values.email}
                        />
                        {touched.email && !!errors.email && <HelperText type="error">{errors.email}</HelperText>}

                        <TextInput
                            label={t("common.password")}
                            style={styles.input}
                            keyboardType="default"
                            secureTextEntry={true}
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.password && !!errors.password}
                            onBlur={() => handleBlur("password")}
                            onChangeText={(val) => setFieldValue("password", val)}
                            value={values.password}
                        />
                        {touched.password && !!errors.password && (
                            <HelperText type="error">{errors.password}</HelperText>
                        )}

                        <TextInput
                            label={t("common.repeatPassword")}
                            style={styles.input}
                            keyboardType="default"
                            secureTextEntry={true}
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.password2 && !!errors.password2}
                            onBlur={() => handleBlur("password2")}
                            onChangeText={(val) => setFieldValue("password2", val)}
                            value={values.password2}
                        />
                        {touched.password2 && !!errors.password2 && (
                            <HelperText type="error">{errors.password2}</HelperText>
                        )}

                        {isSubmitting ? <ProgressBar indeterminate={true} /> : null}
                        <Button mode="contained" disabled={isSubmitting} onPress={() => handleSubmit()}>
                            {t("auth.register.title")}
                        </Button>

                        <View style={styles.row}>
                            <Text>Already have an account?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                                <Text style={styles.link}>Sign in</Text>
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
        marginTop: 4,
    },
    input: {
        marginBottom: 6,
    },
    link: {
        fontWeight: "bold",
        // color: theme.colors.primary,
    },
});

export default Register;

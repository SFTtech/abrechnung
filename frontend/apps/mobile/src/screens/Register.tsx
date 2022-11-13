import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Appbar, Button, HelperText, Text, TextInput, useTheme, ProgressBar } from "react-native-paper";
import { RootDrawerScreenProps } from "../navigation/types";
import { Formik, FormikHelpers } from "formik";
import { z } from "zod";
import { api } from "../core/api";
import { selectAuthSlice, useAppSelector } from "../store";
import { selectIsAuthenticated } from "@abrechnung/redux";
import { notify } from "../notifications";
import { toFormikValidationSchema } from "@abrechnung/utils";

const validationSchema = z.object({
    server: z.string({ required_error: "server is required" }).url({ message: "invalid server url" }),
    username: z.string({ required_error: "username is required" }),
    email: z.string({ required_error: "email is required" }).email({ message: "invalid email" }),
    password: z.string({ required_error: "password is required" }),
    password2: z.string({ required_error: "repeat the password" }),
});
type FormSchema = z.infer<typeof validationSchema>;
type FormErrors = Partial<Record<keyof FormSchema, string>>;

export const Register: React.FC<RootDrawerScreenProps<"Register">> = ({ navigation }) => {
    const theme = useTheme();
    const loggedIn = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));

    React.useEffect(() => {
        if (loggedIn) {
            navigation.navigate("GroupStackNavigator");
        }
    }, [loggedIn, navigation]);

    const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
        api.baseApiUrl = values.server;
        api.register(values.username, values.email, values.password)
            .then((res) => {
                notify({ text: `Registered successfully, please confirm your email before logging in...` });
                setSubmitting(false);
                navigation.navigate("Login");
            })
            .catch((err) => {
                notify({ text: `${err.toString()}` });
                setSubmitting(false);
            });
    };

    const validate = (values: FormSchema) => {
        const errors: FormErrors = {};
        if (values.password !== values.password2) {
            errors["password2"] = "Passwords do not match";
        }
        return errors;
    };

    return (
        <>
            <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
                <Appbar.Content title="Register" />
            </Appbar.Header>
            <Formik
                validate={validate}
                validationSchema={toFormikValidationSchema(validationSchema)}
                validateOnBlur={false}
                validateOnChange={false}
                initialValues={{
                    server: "https://demo.abrechnung.sft.lol",
                    username: "",
                    email: "",
                    password: "",
                    password2: "",
                }}
                onSubmit={handleSubmit}
            >
                {({ values, handleBlur, setFieldValue, touched, handleSubmit, isSubmitting, errors }) => (
                    <View style={styles.container}>
                        <TextInput
                            label="Server"
                            returnKeyType="next"
                            autoCapitalize="none"
                            textContentType="URL"
                            keyboardType="url"
                            value={values.server}
                            onBlur={handleBlur("server")}
                            onChangeText={(val) => setFieldValue("server", val)}
                            error={touched.server && !!errors.server}
                        />
                        <HelperText type="error" visible={touched.server && !!errors.server}>
                            {errors.server}
                        </HelperText>

                        <TextInput
                            autoFocus={true}
                            label="Username"
                            textContentType="username"
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.username && !!errors.username}
                            onBlur={handleBlur("username")}
                            onChangeText={(val) => setFieldValue("username", val)}
                            value={values.username}
                        />
                        <HelperText type="error" visible={touched.username && !!errors.username}>
                            {errors.username}
                        </HelperText>

                        <TextInput
                            label="E-Mail"
                            keyboardType="email-address"
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.email && !!errors.email}
                            onBlur={handleBlur("email")}
                            onChangeText={(val) => setFieldValue("email", val)}
                            value={values.email}
                        />
                        <HelperText type="error" visible={touched.email && !!errors.email}>
                            {errors.email}
                        </HelperText>

                        <TextInput
                            label="Password"
                            keyboardType="default"
                            secureTextEntry={true}
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.password && !!errors.password}
                            onBlur={handleBlur("password")}
                            onChangeText={(val) => setFieldValue("password", val)}
                            value={values.password}
                        />
                        <HelperText type="error" visible={touched.password && !!errors.password}>
                            {errors.password}
                        </HelperText>

                        <TextInput
                            label="Repeat Password"
                            keyboardType="default"
                            secureTextEntry={true}
                            returnKeyType="next"
                            autoCapitalize="none"
                            error={touched.password2 && !!errors.password2}
                            onBlur={handleBlur("password2")}
                            onChangeText={(val) => setFieldValue("password2", val)}
                            value={values.password2}
                        />
                        <HelperText type="error" visible={touched.password2 && !!errors.password2}>
                            {errors.password2}
                        </HelperText>

                        {isSubmitting ? <ProgressBar indeterminate={true} /> : null}
                        <Button mode="contained" disabled={isSubmitting} onPress={handleSubmit}>
                            Register
                        </Button>

                        <View style={styles.row}>
                            <Text>Already have an account? </Text>
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
    link: {
        fontWeight: "bold",
        // color: theme.colors.primary,
    },
});

export default Register;

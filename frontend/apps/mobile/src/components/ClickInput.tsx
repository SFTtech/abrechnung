import * as React from "react";
import { Text, TextInput } from "react-native-paper";
import { Alert, View, TextInput as TextInputNative } from "react-native";

export default function ClickInput(props) {
    console.log(props);
    return (
        <TextInput
            render={(props) => <TextInputNative {...props} />}
            onPressIn={() => Alert.alert("Stuff", "Msg")}
            {...props}
        />
    );
}

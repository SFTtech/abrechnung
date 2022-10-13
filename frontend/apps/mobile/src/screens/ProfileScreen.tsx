import { Text } from "react-native-paper";
import { View } from "react-native";
import * as React from "react";
import { RootDrawerScreenProps } from "../navigation/types";

export const ProfileScreen: React.FC<RootDrawerScreenProps<"Profile">> = () => {
    return (
        <View>
            <Text>Profile</Text>
        </View>
    );
};

export default ProfileScreen;

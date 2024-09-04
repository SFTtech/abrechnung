import { selectProfile } from "@abrechnung/redux";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { Banner, Divider, List } from "react-native-paper";
import { RootDrawerScreenProps } from "../navigation/types";
import { useAppSelector } from "../store";

export const ProfileScreen: React.FC<RootDrawerScreenProps<"Profile">> = () => {
    const profile = useAppSelector(selectProfile);

    if (!profile) {
        return (
            <View>
                <Banner visible={true}>There was an error displaying the profile</Banner>
            </View>
        );
    }

    return (
        <ScrollView>
            <List.Item title="Username" description={profile.username} />
            <List.Item title="E-Mail" description={profile.email} />
            <List.Item title="Registered at" description={profile.registered_at} />

            <Divider />
            <List.Subheader>Sessions</List.Subheader>
            {profile.sessions.map((session) => (
                <List.Item key={session.id} title={session.name} description={`last seen: ${session.last_seen}`} />
            ))}
        </ScrollView>
    );
};

export default ProfileScreen;

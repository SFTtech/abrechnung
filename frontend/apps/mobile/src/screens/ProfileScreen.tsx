import { Banner, Divider, List } from "react-native-paper";
import { View, ScrollView } from "react-native";
import * as React from "react";
import { RootDrawerScreenProps } from "../navigation/types";
import { selectAuthSlice, useAppSelector } from "../store";
import { selectProfile } from "@abrechnung/redux";

export const ProfileScreen: React.FC<RootDrawerScreenProps<"Profile">> = () => {
    const profile = useAppSelector((state) => selectProfile({ state: selectAuthSlice(state) }));

    // React.useEffect(() => {
    //     console.debug("fetching profile");
    //     dispatch(fetchProfile({ api }));
    // });

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
            <List.Item title="Registered at" description={profile.registeredAt} />

            <Divider />
            <List.Subheader>Sessions</List.Subheader>
            {profile.sessions.map((session) => (
                <List.Item key={session.id} title={session.name} description={`last seen: ${session.lastSeen}`} />
            ))}
        </ScrollView>
    );
};

export default ProfileScreen;

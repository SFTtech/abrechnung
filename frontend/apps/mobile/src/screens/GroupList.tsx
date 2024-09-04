import { fetchGroups, selectGroupIds } from "@abrechnung/redux";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { FAB } from "react-native-paper";
import { GroupListItem } from "../components/GroupListItem";
import LoadingIndicator from "../components/LoadingIndicator";
import { useApi } from "../core/ApiProvider";
import { RootDrawerScreenProps } from "../navigation/types";
import { useAppDispatch, useAppSelector } from "../store";

export const GroupList: React.FC<RootDrawerScreenProps<"GroupList">> = ({ navigation, route }) => {
    const dispatch = useAppDispatch();
    const [refreshing, setRefreshing] = React.useState<boolean>(false);
    const groupStatus = useAppSelector((state) => state.groups.status);
    const groupIds = useAppSelector(selectGroupIds);

    const { api } = useApi();

    const onRefresh = () => {
        setRefreshing(true);
        dispatch(fetchGroups({ api })).then(() => setRefreshing(false));
    };

    if (groupStatus === "loading") {
        console.log("group status loading");
    }

    return (
        <>
            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {groupStatus === "loading" ? (
                    <LoadingIndicator />
                ) : (
                    groupIds.map((groupId) => <GroupListItem key={groupId} groupId={groupId} />)
                )}
            </ScrollView>
            <View>
                <FAB
                    style={styles.fab}
                    icon="add"
                    onPress={() => {
                        navigation.navigate("GroupStackNavigator", { screen: "AddGroup" });
                    }}
                />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {},
    item: {
        // backgroundColor: "#f9c2ff",
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
    },
    fab: {
        position: "absolute",
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

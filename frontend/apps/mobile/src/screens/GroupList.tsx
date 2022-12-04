import React from "react";
import { RootDrawerScreenProps } from "../navigation/types";
import { useAppSelector, selectGroupSlice, useAppDispatch } from "../store";
import { fetchGroups, selectGroupIds } from "@abrechnung/redux";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { api } from "../core/api";
import { GroupListItem } from "../components/GroupListItem";
import LoadingIndicator from "../components/LoadingIndicator";
import { FAB } from "react-native-paper";

export const GroupList: React.FC<RootDrawerScreenProps<"GroupList">> = ({ navigation, route }) => {
    const dispatch = useAppDispatch();
    const [refreshing, setRefreshing] = React.useState<boolean>(false);
    const groupStatus = useAppSelector((state) => state.groups.status);
    const groupIds = useAppSelector((state) => selectGroupIds({ state: selectGroupSlice(state) }));
    const onRefresh = () => {
        setRefreshing(true);
        dispatch(fetchGroups({ api })).then(() => setRefreshing(false));
    };

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
                {/* <Portal> */}
                {/* </Portal> */}
            </ScrollView>
            <View>
                <FAB
                    style={styles.fab}
                    icon="add"
                    onPress={() => {
                        navigation.navigate("AddGroup");
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

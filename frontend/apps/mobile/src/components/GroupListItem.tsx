import { useNavigation } from "@react-navigation/native";
import React from "react";
import { List } from "react-native-paper";
import { useApi } from "../core/ApiProvider";
import { changeActiveGroup, useAppDispatch } from "../store";
import { RootDrawerParamList } from "../navigation/types";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useGroup } from "@abrechnung/redux";

interface Props {
    groupId: number;
}

export const GroupListItem: React.FC<Props> = ({ groupId }) => {
    const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
    const dispatch = useAppDispatch();
    const { api } = useApi();
    const group = useGroup(groupId);

    if (group === undefined) {
        return null;
    }

    return (
        <List.Item
            key={groupId}
            title={group.name}
            description={group.description}
            onPress={() => {
                dispatch(changeActiveGroup({ api, groupId: group.id }))
                    .unwrap()
                    .then(() => {
                        navigation.navigate("GroupStackNavigator", {
                            screen: "BottomTabNavigator",
                            params: {
                                screen: "TransactionList",
                                params: { groupId },
                            },
                        });
                    });
            }}
        />
    );
};

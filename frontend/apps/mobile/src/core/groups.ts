import { atom, RecoilState, selector, selectorFamily, useRecoilValue } from "recoil";
import { getGroups, groupNotifier } from "./database/groups";
import { Group } from "@abrechnung/types";
import { useNavigation } from "@react-navigation/native";

export const activeGroupIDState = atom<number | null>({
    key: "activeGroupIDState",
    default: null,
});

export const groupState: RecoilState<Group[]> = atom<Group[]>({
    key: "groupState",
    default: getGroups(),
    effects: [
        ({ setSelf }) => {
            return groupNotifier.subscribe("https://abrechnung.stusta.de", () => {
                getGroups().then((result) => setSelf(result));
            });
        },
    ],
});

export const activeGroupState = selector<Group | undefined>({
    key: "activeGroupState",
    get: ({ get }) => {
        const groups = get(groupState);
        const activeGroupID = get(activeGroupIDState);
        return groups.find((g) => g.id === activeGroupID);
    },
});

export const groupByIDState = selectorFamily<Group | undefined, number>({
    key: "groupByIDState",
    get:
        (groupID) =>
        ({ get }) => {
            const groups = get(groupState);
            return groups.find((g) => g.id === groupID);
        },
});

export const useActiveGroupID = (): number => {
    const groupID = useRecoilValue(activeGroupIDState);
    const navigation = useNavigation();
    if (groupID === null) {
        navigation.navigate("Home");
        throw new Error("active group ID was null unexpectedly");
    }
    return groupID;
};

export const useActiveGroup = (): Group => {
    const group = useRecoilValue(activeGroupState);
    const navigation = useNavigation();
    if (group == null) {
        navigation.navigate("Home");
        throw new Error("active group was null unexpectedly");
    }
    return group;
};

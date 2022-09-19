import { atom, selector, selectorFamily } from "recoil";
import { getGroups, groupNotifier } from "./database/groups";
import { Group } from "@abrechnung/types";

export const activeGroupIDState = atom<number | null>({
    key: "activeGroupIDState",
    default: null,
});

export const groupState = atom<Group[]>({
    key: "groupState",
    default: getGroups(),
    effects: [
        ({ setSelf }) => {
            return groupNotifier.subscribe("https://abrechnung.stusta.de", () => {
                getGroups().then(result => setSelf(result));
            });
        },
    ],
});

export const activeGroupState = selector<Group | null>({
    key: "activeGroupState",
    get: ({ get }) => {
        const groups = get(groupState);
        const activeGroupID = get(activeGroupIDState)
        return groups.find(g => g.id === activeGroupID) ?? null;
    },
});

export const groupByIDState = selectorFamily<Group, number>({
    key: "groupByIDState",
    get: (groupID) => ({ get }) => {
        const groups = get(groupState);
        return groups.find(g => g.id === groupID);
    },
});

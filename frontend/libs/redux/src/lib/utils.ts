import { GroupScopedState } from "./types";

export const getGroupScopedState = <T, K extends GroupScopedState<T>>(state: K, groupId: number): T => {
    const s = state.byGroupId[groupId];
    if (!s) {
        console.error("error in getGroupScopedState", state, groupId);
        throw new Error(`no scoped subtree present for group with id ${groupId}`);
    }
    return s;
};

// utility functions for reducers
export interface Entity {
    id: number;
}
export interface EntityState<T extends Entity> {
    byId: { [k: number]: T };
    ids: number[];
}

export const addEntity = <T extends Entity>(state: EntityState<T>, entity: T) => {
    if (state.byId[entity.id] === undefined) {
        state.ids.push(entity.id);
    }
    state.byId[entity.id] = entity;
};

export const removeEntity = <T extends Entity>(state: EntityState<T>, entityId: number) => {
    if (state.byId[entityId] === undefined) {
        return;
    }
    delete state.byId[entityId];
    state.ids = state.ids.filter((id) => id !== entityId);
};

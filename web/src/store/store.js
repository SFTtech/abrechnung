import {configureStore} from "@reduxjs/toolkit";
import {combineEpics, createEpicMiddleware} from "redux-observable";

import authReducer, {authEpic} from "./authSlice";
import messagesReducer from "../features/messages/messagesSlice";
import profileReducer from "./profileSlice";
import groupsReducer, {groupsEpic} from "./groupsSlice";

const epicMiddleware = createEpicMiddleware();

export default configureStore({
    reducer: {
        auth: authReducer,
        groups: groupsReducer,
        messages: messagesReducer,
        profile: profileReducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(epicMiddleware);
    },
});

const rootEpic = combineEpics(
    authEpic,
    groupsEpic,
)

epicMiddleware.run(rootEpic);

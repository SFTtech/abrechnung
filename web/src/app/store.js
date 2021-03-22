import {configureStore} from "@reduxjs/toolkit";
import {combineEpics, createEpicMiddleware} from "redux-observable";

import authReducer, {authEpic} from "../features/auth/authSlice";
import messagesReducer from "../features/messages/messagesSlice";
import profileReducer from "../features/profile/profileSlice";
import groupsReducer, {groupsEpic} from "../features/groups/groupsSlice";
import transactionsReducer from "../features/transactions/transactionsSlice";
import accountsSlice from "../features/transactions/accountsSlice";

const epicMiddleware = createEpicMiddleware();

export default configureStore({
    reducer: {
        auth: authReducer,
        groups: groupsReducer,
        messages: messagesReducer,
        profile: profileReducer,
        transactions: transactionsReducer,
        accounts: accountsSlice,
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

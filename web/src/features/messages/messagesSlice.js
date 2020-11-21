import { createSlice } from '@reduxjs/toolkit';

export const messageSlice = createSlice({
    name: 'messages',
    initialState: {
        msg: null,
        status: "info" // or error, success, warning
    },
    reducers: {
        createMessage: (state, action) => {
            state.msg = action.payload.msg;
            state.status = "info";
        },
        createError: (state, action) => {
            state.msg = action.payload.msg;
            state.status = "error";
        },
        removeMessage: (state) => {
            state.msg = null;
        }
    },
});

export const { createMessage, createError, removeMessage } = messageSlice.actions;


export default messageSlice.reducer;

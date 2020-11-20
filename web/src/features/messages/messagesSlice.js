import { createSlice } from '@reduxjs/toolkit';

export const messageSlice = createSlice({
    name: 'messages',
    initialState: {
        msg: null,
        status: 0
    },
    reducers: {
        createMessage: (state, msg) => {
            state.msg = msg;
        },
        error: (state, msg, status) => {
            state.msg = msg;
            state.status = status
        },
    },
});

export const { createMessage, error } = messageSlice.actions;


export default messageSlice.reducer;

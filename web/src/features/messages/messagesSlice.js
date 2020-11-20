import { createSlice } from '@reduxjs/toolkit';

export const messageSlice = createSlice({
    name: 'messages',
    initialState: {
        msg: null,
        status: 0
    },
    reducers: {
        createMessage: (state, action) => {
            state.msg = action.payload.msg;
            state.status = 200;
        },
        createError: (state, action) => {
            state.msg = action.payload.msg;
            state.status = action.payload.status
        },
    },
});

export const { createMessage, createError } = messageSlice.actions;


export default messageSlice.reducer;

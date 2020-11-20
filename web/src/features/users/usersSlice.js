import {createSlice} from '@reduxjs/toolkit';

export const usersSlice = createSlice({
    name: 'users',
    initialState: {
        users: [],
    },
    reducers: {},
});

export const {} = usersSlice.actions;

export default usersSlice.reducer;

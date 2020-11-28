import {createSlice} from '@reduxjs/toolkit';

export const usersSlice = createSlice({
    name: 'users',
    initialState: {
        users: [],
        groups: [
            {
                name: 'asdf 1234'
            },
            {
                name: "afoiejöfoi"
            }
        ],
    },
    reducers: {},
});

// export const {} = usersSlice.actions;

export default usersSlice.reducer;

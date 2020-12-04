import {createSlice} from '@reduxjs/toolkit';

export const usersSlice = createSlice({
    name: 'users',
    initialState: {
        users: [],
        groups: [
            {
                id: 1,
                name: "asdf 1234",
                description: "some description 1",
                temrs: "some terms",
                currency: "€",
            },
            {
                id: 2,
                name: "afoiejöfoi",
                description: "some description 2",
                temrs: "some terms",
                currency: "€",
            }
        ],
        status: 'idle', // or loading | failed
        error: null,
    },
    reducers: {},
});

// export const {} = usersSlice.actions;

export default usersSlice.reducer;

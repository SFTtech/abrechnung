import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import messagesReducer from '../features/messages/messagesSlice';
import profileReducer from '../features/profile/profileSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    messages: messagesReducer,
    profile: profileReducer,
  },
});

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Portal = 'superadmin' | 'admin' | 'b2b' | 'corporate';

export interface AuthUser {
  token: string;
  portal?: Portal;
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  portal: Portal | null;
}

const initialState: AuthState = {
  user: null,
  portal: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.portal = action.payload.portal ?? null;
    },
    clearCredentials: state => {
      state.user = null;
      state.portal = null;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

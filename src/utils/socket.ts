import { io } from 'socket.io-client';
const URL ='http://localhost:3001/';

export const socket = io(URL, {
    auth: {
        access_token: localStorage.getItem('auth_token')
    },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 3,
});
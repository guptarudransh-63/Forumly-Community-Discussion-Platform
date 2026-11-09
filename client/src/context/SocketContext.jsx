import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const s = io('/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      // connected to socket
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?._id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);

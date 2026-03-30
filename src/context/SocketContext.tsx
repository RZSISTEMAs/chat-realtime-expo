import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

interface SocketContextData {
  socket: Socket | null;
  online: boolean;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const newSocket = io(API_URL, {
        query: user ? { userId: user.id } : {},
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        setOnline(true);
        console.log('[Socket] Conectado:', newSocket.id);
        if (user) {
            newSocket.emit('setup_user', user.id);
        }
      });

      newSocket.on('disconnect', () => setOnline(false));

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      socket?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, online }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

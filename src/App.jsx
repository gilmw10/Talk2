import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';

export default function App() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [screen, setScreen] = useState('lobby');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [toasts, setToasts] = useState([]);

  const socketRef = useRef(null);
  const usersRef = useRef(users);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const addToast = (text, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const socketUrl = import.meta.env.DEV ? 'http://localhost:3000' : '/';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setScreen('lobby');
      addToast('서버와 연결이 끊어졌습니다.', 'error');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('connecting');
    });

    socket.on('error-msg', (msg) => {
      addToast(msg, 'error');
      setScreen('lobby');
    });

    socket.on('room-joined', ({ roomCode, users }) => {
      setRoomCode(roomCode);
      setUsers(users);
      setScreen('chat');
      setMessages([
        {
          type: 'system',
          content: `대화방 [${roomCode}]에 참여했습니다. 상대방을 기다리는 중입니다...`
        }
      ]);
      addToast(`대화방 [${roomCode}]에 입장했습니다.`, 'success');
    });

    socket.on('user-joined', ({ username }) => {
      setMessages((prev) => [
        ...prev,
        { type: 'system', content: `${username}님이 입장하셨습니다.` }
      ]);
      addToast(`${username}님이 참여했습니다.`, 'info');
    });

    socket.on('chat-ready', ({ users }) => {
      setUsers(users);
      setMessages((prev) => [
        ...prev,
        { type: 'system', content: '대화 상대가 연결되었습니다! 이제 대화를 시작해보세요.' }
      ]);
      addToast('1대1 대화가 준비되었습니다!', 'success');
    });

    socket.on('chat-message', (msgData) => {
      setMessages((prev) => [...prev, msgData]);
    });

    socket.on('typing', ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        const user = usersRef.current.find(u => u.username === username);
        if (user) {
          updated[user.socketId] = isTyping;
        } else {
          updated[username] = isTyping;
        }
        return updated;
      });
    });

    socket.on('user-left', ({ username }) => {
      setMessages((prev) => [
        ...prev,
        { type: 'system', content: `${username}님이 퇴장하셨습니다.` }
      ]);
      addToast(`${username}님이 퇴장했습니다.`, 'info');
    });

    socket.on('chat-broken', ({ message }) => {
      addToast(message, 'info');
      setUsers((prev) => prev.filter(u => u.socketId === socket.id));
      setTypingUsers({});
    });

    socket.on('match-queued', () => {
      setScreen('matching');
      addToast('상대방을 탐색 중입니다...', 'info');
    });

    socket.on('match-cancelled', () => {
      setScreen('lobby');
      addToast('매칭이 취소되었습니다.', 'info');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setTypingUsers((prev) => {
      const cleaned = {};
      users.forEach(u => {
        if (prev[u.socketId] !== undefined) {
          cleaned[u.socketId] = prev[u.socketId];
        }
      });
      return cleaned;
    });
  }, [users]);

  const handleQuickMatch = () => {
    if (socketRef.current) {
      socketRef.current.emit('start-match', { username });
    }
  };

  const handleCancelMatch = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-queue');
    }
  };

  const handleCreateRoom = () => {
    if (socketRef.current) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomCode = 'ROOM-';
      for (let i = 0; i < 5; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      socketRef.current.emit('join-room', { username, roomCode: randomCode });
    }
  };

  const handleJoinRoom = () => {
    if (socketRef.current && roomCodeInput.trim()) {
      socketRef.current.emit('join-room', { username, roomCode: roomCodeInput });
    }
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      setScreen('lobby');
      setRoomCode('');
      setRoomCodeInput('');
      setMessages([]);
      setUsers([]);
      setTypingUsers({});
      addToast('대화방을 나갔습니다.', 'info');
    }
  };

  const statusLabel =
    connectionStatus === 'connected' ? '연결됨' :
    connectionStatus === 'disconnected' ? '연결 끊김' : '연결 중...';

  const isLobby = screen === 'lobby';

  return (
    <div className={isLobby ? 'app-fullscreen' : 'app-wrapper'}>
      {/* 토스트는 항상 화면 위에 고정 */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`toast toast-${toast.type} ${toast.removing ? 'removing' : ''}`}
          >
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'i'}
            </span>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>

      {isLobby ? (
        /* Lobby: 전체 화면 - app-wrapper 제약 없이 바로 렌더 */
        <Lobby
          username={username}
          setUsername={setUsername}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          onQuickMatch={handleQuickMatch}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <main className="app-main">
          {screen === 'matching' && (
            <div className="overlay">
              <div className="card match-waiting-card">
                <div className="spinner" />
                <h2>상대방을 찾는 중...</h2>
                <p>대기열에서 1대1 대화 상대를 검색하고 있습니다.</p>
                <button onClick={handleCancelMatch} className="btn btn-danger btn-full">
                  매칭 취소
                </button>
              </div>
            </div>
          )}

          {screen === 'chat' && socketRef.current && (
            <ChatRoom
              socket={socketRef.current}
              roomCode={roomCode}
              users={users}
              messages={messages}
              typingUsers={typingUsers}
              onLeaveRoom={handleLeaveRoom}
              addToast={addToast}
            />
          )}
        </main>
      )}

      {!isLobby && (
        <footer className="app-footer-bar">
          <p>© 2026 Talk2 — 빠르고 안전한 1대1 실시간 채팅</p>
        </footer>
      )}
    </div>
  );
}
